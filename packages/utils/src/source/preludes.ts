import type { CssBlockKind } from "./shared";
import { scanCssBlocks } from "./scanner";

export type { CssBlockKind } from "./shared";

export interface CssBlockPrelude {
  blockKind: CssBlockKind;
  end: number;
  normalizedPrelude: string;
  parentKind: CssBlockKind | undefined;
  preludeSource: string;
  start: number;
}

/**
 * Walks CSS source and reports each block prelude at the point its `{` is
 * encountered.
 *
 * The callback receives both the original prelude slice and a normalized form
 * with comments stripped and surrounding whitespace trimmed. This keeps higher
 * level transforms focused on their own rewrite logic rather than on source
 * scanning details.
 */
export function walkCssBlockPreludes(
  source: string,
  visitPrelude: (prelude: CssBlockPrelude) => void,
): void {
  scanCssBlocks(source, {
    onPrelude: (prelude) => {
      visitPrelude({
        blockKind: prelude.blockKind,
        end: prelude.preludeEnd,
        normalizedPrelude: prelude.normalizedPrelude,
        parentKind: prelude.parentKind,
        preludeSource: prelude.preludeSource,
        start: prelude.start,
      });
    },
  });
}
