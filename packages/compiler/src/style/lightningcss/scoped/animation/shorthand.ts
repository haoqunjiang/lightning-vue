import { splitTopLevelSegments, splitTopLevelWhitespace } from "./scan";
import { rewriteAnimationNameValue } from "./names";

export function rewriteAnimationShorthandValue(
  value: string,
  keyframes: Record<string, string>,
): string {
  if (!value.includes(",")) {
    return rewriteAnimationShorthandComponent(value.trim(), keyframes);
  }

  return splitTopLevelSegments(value, ",")
    .map((part) => rewriteAnimationShorthandComponent(part.trim(), keyframes))
    .join(", ");
}

function rewriteAnimationShorthandComponent(
  value: string,
  keyframes: Record<string, string>,
): string {
  const tokens = splitTopLevelWhitespace(value);
  if (!tokens.length) {
    return value;
  }

  // On normalized Lightning CSS output, explicit animation names are serialized
  // in the final token position.
  const lastTokenIndex = tokens.length - 1;
  const lastToken = tokens[lastTokenIndex];
  const rewrittenLastToken = rewriteAnimationNameValue(lastToken, keyframes);
  if (rewrittenLastToken !== lastToken) {
    tokens[lastTokenIndex] = rewrittenLastToken;
    return tokens.join(" ");
  }

  return value;
}
