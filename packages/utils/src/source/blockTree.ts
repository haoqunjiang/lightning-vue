import type { CssBlockKind } from "./shared";
import { scanCssBlocks } from "./scanner";

export interface CssBlockNode {
  blockKind: CssBlockKind;
  bodyEnd: number;
  bodyStart: number;
  children: CssBlockNode[];
  end: number;
  normalizedPrelude: string;
  preludeEnd: number;
  preludeSource: string;
  start: number;
}

/**
 * Builds a lightweight block tree from raw CSS source.
 *
 * This is intentionally structural, not semantic: it only records block
 * ranges, normalized preludes, and child relationships so higher-level source
 * transforms can reason about mixed declarations and nested blocks.
 */
export function parseCssBlockTree(source: string): CssBlockNode[] {
  const roots: CssBlockNode[] = [];
  const stack: CssBlockNode[] = [];
  scanCssBlocks(source, {
    onPrelude: (prelude) => {
      const node: CssBlockNode = {
        blockKind: prelude.blockKind,
        bodyEnd: -1,
        bodyStart: prelude.bodyStart,
        children: [],
        end: -1,
        normalizedPrelude: prelude.normalizedPrelude,
        preludeEnd: prelude.preludeEnd,
        preludeSource: prelude.preludeSource,
        start: prelude.start,
      };

      const parent = stack[stack.length - 1];
      if (parent) {
        parent.children.push(node);
      } else {
        roots.push(node);
      }

      stack.push(node);
    },
    onCloseBlock: (block) => {
      const node = stack.pop();
      if (!node) {
        return;
      }

      node.bodyEnd = block.bodyEnd;
      node.end = block.end;
    },
  });

  return roots;
}
