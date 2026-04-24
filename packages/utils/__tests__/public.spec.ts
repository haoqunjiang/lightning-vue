import type { TokenOrValue } from "lightningcss";
import * as utils from "../src";
import * as selectors from "../src/selectors";
import * as source from "../src/source";

function stringifySelectorList(
  selectorList: ReturnType<typeof utils.parseSelectorListFromString>,
): string {
  return selectorList.map((selector) => utils.stringifySelector(selector)).join(", ");
}

describe("public root entrypoint", () => {
  test("re-exports the selector-facing API", () => {
    expect(utils.parseSelectorListFromString).toBe(selectors.parseSelectorListFromString);
    expect(utils.parseSelectorListFromTokens).toBe(selectors.parseSelectorListFromTokens);
    expect(utils.decodeCssEscape).toBe(selectors.decodeCssEscape);
    expect(utils.stringifySelector).toBe(selectors.stringifySelector);
    expect(utils.stringifyTokens).toBe(selectors.stringifyTokens);
  });

  test("re-exports the source-facing API", () => {
    expect(utils.walkCssBlockPreludes).toBe(source.walkCssBlockPreludes);
    expect(utils.analyzeCssNestingStructure).toBe(source.analyzeCssNestingStructure);
    expect(utils.rewriteCssSelectorSource).toBe(source.rewriteCssSelectorSource);
    expect(utils.rewriteCssSelectorSourceWithMap).toBe(source.rewriteCssSelectorSourceWithMap);
    expect(utils.parseCssBlockTree).toBe(source.parseCssBlockTree);
    expect(utils.scopeSelectorPrelude).toBe(source.scopeSelectorPrelude);
    expect(utils.forEachTopLevelTextRange).toBe(source.forEachTopLevelTextRange);
    expect(utils.someTopLevelTextRange).toBe(source.someTopLevelTextRange);
    expect(utils.findLastNonWhitespaceIndex).toBe(source.findLastNonWhitespaceIndex);
    expect(utils.findTrimmedCssRange).toBe(source.findTrimmedCssRange);
    expect(utils.findTrimmedSourceRange).toBe(source.findTrimmedSourceRange);
    expect(utils.hasMeaningfulCssText).toBe(source.hasMeaningfulCssText);
  });

  test("supports selector parsing and stringifying through the root entrypoint", () => {
    const selectorList = utils.parseSelectorListFromString(".foo, :is(.bar, .baz)");

    expect(stringifySelectorList(selectorList)).toBe(".foo, :is(.bar, .baz)");
  });

  test("supports token parsing and stringifying through the root entrypoint", () => {
    const tokens: TokenOrValue[] = [
      { type: "token", value: { type: "ident", value: "foo" } },
      { type: "token", value: { type: "comma" } },
      { type: "token", value: { type: "white-space", value: " " } },
      { type: "token", value: { type: "ident", value: "bar" } },
    ];

    const selectorList = utils.parseSelectorListFromTokens(tokens);

    expect(stringifySelectorList(selectorList)).toBe("foo, bar");
    expect(utils.stringifyTokens(tokens)).toBe("foo, bar");
    expect(utils.decodeCssEscape("\\31 foo", 0)).toEqual({ end: 4, value: "1" });
  });

  test("supports source rewrites through the root entrypoint", () => {
    const rewritten = utils.rewriteCssSelectorSource(".foo { color: red; }", {
      tryRewritePreludeDirect: (prelude) => utils.scopeSelectorPrelude(prelude, "data-test"),
      appendRewrittenSelectors: () => {
        throw new Error("root entrypoint should take the direct path here");
      },
    });

    expect(rewritten).toBe(".foo[data-test]{ color: red; }");
  });

  test("exposes block walking and block-tree parsing through the root entrypoint", () => {
    const sourceCode = `
.foo {
  @media (min-width: 1px) {
    .bar {
      color: red;
    }
  }
}
`;

    const preludes: string[] = [];
    utils.walkCssBlockPreludes(sourceCode, (prelude) => {
      preludes.push(prelude.normalizedPrelude);
    });

    expect(preludes).toEqual([".foo", "@media (min-width: 1px)", ".bar"]);
    expect(utils.findLastNonWhitespaceIndex("  .foo \n")).toBe(5);
    expect(utils.findTrimmedCssRange("  .foo \n")).toEqual({ start: 2, end: 6 });
    expect(utils.analyzeCssNestingStructure(sourceCode)).toEqual({
      hasNestedSelectorChildren: false,
      hasNestedAtRuleChildren: true,
      hasNestedSelectorDescendantsInAtRuleChildren: true,
      hasMixedNestedChildren: false,
    });

    const roots = utils.parseCssBlockTree(sourceCode);
    expect(roots).toHaveLength(1);
    expect(roots[0].normalizedPrelude).toBe(".foo");
    expect(roots[0].children[0].normalizedPrelude).toBe("@media (min-width: 1px)");
  });
});
