import type { CssBlockKind } from "./shared";
import {
  getCssBlockKind,
  isCustomPropertyDeclarationPrelude,
  normalizeBlockPrelude,
} from "./shared";

export interface CssBlockScanPrelude {
  blockKind: CssBlockKind;
  parentKind: CssBlockKind | undefined;
  normalizedPrelude: string;
  preludeEnd: number;
  preludeSource: string;
  start: number;
}

export interface CssBlockScanOpenBlock extends CssBlockScanPrelude {
  bodyStart: number;
}

export interface CssBlockScanBlock extends CssBlockScanOpenBlock {
  bodyEnd: number;
  end: number;
}

export interface CssBlockScanOptions {
  onCloseBlock?: (block: CssBlockScanBlock) => void;
  onPrelude?: (prelude: CssBlockScanOpenBlock) => void;
}

export function scanCssBlocks(source: string, options: CssBlockScanOptions): void {
  const { onCloseBlock, onPrelude } = options;
  const stack: CssBlockScanBlock[] = [];
  let segmentStart = 0;
  let segmentHasComment = false;
  let bracketDepth = 0;
  let customPropertyBraceDepth = 0;
  let customPropertyValue = false;
  let parenDepth = 0;
  let quote: '"' | "'" | undefined;

  function resetSegmentState(nextSegmentStart: number): void {
    segmentStart = nextSegmentStart;
    segmentHasComment = false;
    customPropertyBraceDepth = 0;
    customPropertyValue = false;
  }

  for (let index = 0; index < source.length; index++) {
    const current = source[index];

    if (quote) {
      if (current === "\\") {
        index++;
      } else if (current === quote) {
        quote = undefined;
      }
      continue;
    }

    if (current === "/" && source[index + 1] === "*") {
      const commentEnd = source.indexOf("*/", index + 2);
      if (commentEnd === -1) {
        break;
      }
      segmentHasComment = true;
      index = commentEnd + 1;
      continue;
    }

    if (current === '"' || current === "'") {
      quote = current;
      continue;
    }

    if (current === "(") {
      parenDepth++;
      continue;
    }
    if (current === ")" && parenDepth) {
      parenDepth--;
      continue;
    }

    if (current === "[") {
      bracketDepth++;
      continue;
    }
    if (current === "]" && bracketDepth) {
      bracketDepth--;
      continue;
    }

    if (
      current === ":" &&
      !customPropertyValue &&
      isCustomPropertyDeclarationPrelude(source.slice(segmentStart, index))
    ) {
      customPropertyValue = true;
      continue;
    }

    if (parenDepth || bracketDepth) {
      continue;
    }

    if (customPropertyValue) {
      if (current === "{") {
        customPropertyBraceDepth++;
        continue;
      }

      if (current === "}") {
        if (customPropertyBraceDepth) {
          customPropertyBraceDepth--;
          continue;
        }
        customPropertyValue = false;
      }
    }

    if (current === ";") {
      if (customPropertyValue && customPropertyBraceDepth) {
        continue;
      }
      resetSegmentState(index + 1);
      continue;
    }

    if (current === "{") {
      const preludeSource = source.slice(segmentStart, index);
      const normalizedPrelude = segmentHasComment
        ? normalizeBlockPrelude(preludeSource)
        : preludeSource.trim();
      const block: CssBlockScanBlock = {
        blockKind: getCssBlockKind(normalizedPrelude),
        parentKind: stack[stack.length - 1]?.blockKind,
        normalizedPrelude,
        preludeEnd: index,
        preludeSource,
        start: segmentStart,
        bodyStart: index + 1,
        bodyEnd: -1,
        end: -1,
      };

      onPrelude?.(block);
      stack.push(block);
      resetSegmentState(index + 1);
      continue;
    }

    if (current === "}") {
      const block = stack.pop();
      if (block) {
        block.bodyEnd = index;
        block.end = index + 1;
        onCloseBlock?.(block);
      }
      resetSegmentState(index + 1);
    }
  }
}
