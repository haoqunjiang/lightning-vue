import { splitTopLevelSegments, splitTopLevelWhitespace } from "./scan";
import { rewriteAnimationNameValue } from "./names";

export function rewriteAnimationShorthandValue(
  value: string,
  keyframes: Record<string, string>,
): string {
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

  const nextTokens = tokens.slice();
  // On normalized Lightning CSS output, explicit animation names are serialized
  // in the final token position.
  const lastTokenIndex = tokens.length - 1;
  const rewrittenLastToken = rewriteAnimationNameValue(nextTokens[lastTokenIndex], keyframes);
  if (rewrittenLastToken !== nextTokens[lastTokenIndex]) {
    nextTokens[lastTokenIndex] = rewrittenLastToken;
    return nextTokens.join(" ");
  }

  return value;
}
