import type { CssBlockNode } from "./blockTree";
import { isWhitespace } from "../selectors/shared";

export interface CssTextRange {
  end: number;
  start: number;
}

export function forEachTopLevelTextRange(
  block: CssBlockNode,
  visit: (start: number, end: number) => void,
): void {
  let segmentStart = block.bodyStart;

  for (const child of block.children) {
    visit(segmentStart, child.start);
    segmentStart = child.end;
  }

  visit(segmentStart, block.bodyEnd);
}

export function someTopLevelTextRange(
  block: CssBlockNode,
  test: (start: number, end: number) => boolean,
): boolean {
  let segmentStart = block.bodyStart;

  for (const child of block.children) {
    if (test(segmentStart, child.start)) {
      return true;
    }
    segmentStart = child.end;
  }

  return test(segmentStart, block.bodyEnd);
}

export function findTrimmedSourceRange(
  source: string,
  absoluteStart: number,
): { end: number; start: number; text: string } | null {
  const range = findTrimmedCssRange(source, absoluteStart);
  if (!range) {
    return null;
  }

  return {
    ...range,
    text: source.slice(range.start - absoluteStart, range.end - absoluteStart),
  };
}

export function findTrimmedCssRange(
  source: string,
  absoluteStart: number = 0,
): CssTextRange | null {
  let start = 0;
  let end = source.length;

  while (start < end && isWhitespace(source[start])) {
    start++;
  }

  while (end > start && isWhitespace(source[end - 1])) {
    end--;
  }

  if (start === end) {
    return null;
  }

  return {
    end: absoluteStart + end,
    start: absoluteStart + start,
  };
}

export function findLastNonWhitespaceIndex(source: string): number {
  for (let index = source.length - 1; index >= 0; index--) {
    if (!isWhitespace(source[index])) {
      return index;
    }
  }

  return -1;
}

export function hasMeaningfulCssText(source: string): boolean {
  return !!stripCssComments(source).trim();
}

function stripCssComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, " ");
}
