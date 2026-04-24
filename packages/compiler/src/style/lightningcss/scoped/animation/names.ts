import { normalizeEscapedKeyframesName } from "../../keyframeNames";
import { splitTopLevelSegments } from "./scan";

export function rewriteAnimationNameValue(
  value: string,
  keyframes: Record<string, string>,
): string {
  if (!value.includes(",")) {
    return rewriteAnimationNameComponent(value.trim(), keyframes);
  }

  return splitTopLevelSegments(value, ",")
    .map((part) => rewriteAnimationNameComponent(part.trim(), keyframes))
    .join(", ");
}

export function rewriteRawAnimationIdentifier(
  raw: string,
  keyframes: Record<string, string>,
): string | undefined {
  const normalized = normalizeEscapedKeyframesName(raw);
  const rewritten = keyframes[normalized];
  if (!rewritten) {
    return undefined;
  }

  return raw === normalized || !rewritten.startsWith(normalized)
    ? rewritten
    : raw + rewritten.slice(normalized.length);
}

function rewriteAnimationNameComponent(value: string, keyframes: Record<string, string>): string {
  if (!value) {
    return value;
  }

  const quoted = parseQuotedAnimationName(value);
  if (quoted) {
    const rewrittenInner = rewriteRawAnimationIdentifier(quoted.value, keyframes);
    return rewrittenInner ? `${quoted.quote}${rewrittenInner}${quoted.quote}` : value;
  }

  return rewriteRawAnimationIdentifier(value, keyframes) || value;
}

function parseQuotedAnimationName(source: string): { quote: '"' | "'"; value: string } | null {
  const quote = source[0];
  if ((quote !== '"' && quote !== "'") || source[source.length - 1] !== quote) {
    return null;
  }

  return {
    quote,
    value: source.slice(1, -1),
  };
}
