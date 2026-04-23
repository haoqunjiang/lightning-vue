import { scanCssBlocks, type CssBlockScanPrelude } from "./scanner";

export interface CssNestingStructureSummary {
  /**
   * `true` when a style rule directly contains one or more nested style-rule
   * children such as `.foo { .bar { ... } }`.
   */
  hasNestedSelectorChildren: boolean;
  /**
   * `true` when a style rule directly contains one or more nested at-rule
   * children such as `.foo { @media (...) { ... } }`.
   */
  hasNestedAtRuleChildren: boolean;
  /**
   * `true` when a nested at-rule inside a style rule contains deeper nested
   * selector descendants such as `.foo { @media (...) { .bar { ... } } }`.
   */
  hasNestedSelectorDescendantsInAtRuleChildren: boolean;
  /**
   * `true` when the same style rule contains both direct nested selectors and
   * direct nested at-rules in the same body.
   */
  hasMixedNestedChildren: boolean;
}

interface StyleChildStructureState {
  hasNestedAtRuleChild: boolean;
  hasNestedSelectorChild: boolean;
}

export function analyzeCssNestingStructure(
  source: string,
  visitPrelude?: (prelude: CssBlockScanPrelude) => void,
): CssNestingStructureSummary {
  const summary: CssNestingStructureSummary = {
    hasNestedSelectorChildren: false,
    hasNestedAtRuleChildren: false,
    hasNestedSelectorDescendantsInAtRuleChildren: false,
    hasMixedNestedChildren: false,
  };
  const insideStyleNestedAtRuleStack: boolean[] = [];
  const directStyleChildStateStack: Array<StyleChildStructureState | undefined> = [];

  scanCssBlocks(source, {
    onPrelude: (prelude) => {
      visitPrelude?.(prelude);

      const insideStyleNestedAtRule =
        insideStyleNestedAtRuleStack[insideStyleNestedAtRuleStack.length - 1];
      if (prelude.blockKind === "style" && insideStyleNestedAtRule) {
        summary.hasNestedSelectorDescendantsInAtRuleChildren = true;
      }

      const parentStyleState = directStyleChildStateStack[directStyleChildStateStack.length - 1];
      if (prelude.parentKind === "style" && parentStyleState) {
        if (prelude.blockKind === "style") {
          parentStyleState.hasNestedSelectorChild = true;
          summary.hasNestedSelectorChildren = true;
        } else if (prelude.blockKind === "at-rule") {
          parentStyleState.hasNestedAtRuleChild = true;
          summary.hasNestedAtRuleChildren = true;
        }

        if (parentStyleState.hasNestedSelectorChild && parentStyleState.hasNestedAtRuleChild) {
          summary.hasMixedNestedChildren = true;
        }
      }

      insideStyleNestedAtRuleStack.push(
        !!insideStyleNestedAtRule ||
          (prelude.blockKind === "at-rule" && prelude.parentKind === "style"),
      );
      directStyleChildStateStack.push(
        prelude.blockKind === "style"
          ? {
              hasNestedAtRuleChild: false,
              hasNestedSelectorChild: false,
            }
          : undefined,
      );
    },
    onCloseBlock: () => {
      insideStyleNestedAtRuleStack.pop();
      directStyleChildStateStack.pop();
    },
  });

  return summary;
}
