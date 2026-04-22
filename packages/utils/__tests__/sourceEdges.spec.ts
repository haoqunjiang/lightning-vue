import { vi } from "vitest";
import type { Selector } from "lightningcss";
import type { CssBlockPrelude } from "../src/source";
import {
  findLastNonWhitespaceIndex,
  forEachTopLevelTextRange,
  hasMeaningfulCssText,
  parseCssBlockTree,
  rewriteCssSelectorSource,
  rewriteCssSelectorSourceWithMap,
  scopeSelectorPrelude,
  walkCssBlockPreludes,
} from "../src/source";

describe("source edge coverage", () => {
  test("walkers ignore braces and brackets inside strings, urls, comments, and vendor keyframes", () => {
    const source = `
.foo[data-icon="{"] {
  background: url("data:image/svg+xml,<svg>{}</svg>");
  content: "}";
  /* comment { } */
  .bar { color: red; }
}
@-webkit-keyframes spin {
  from { opacity: 0; }
}
`;

    const preludes: CssBlockPrelude[] = [];
    walkCssBlockPreludes(source, (prelude) => {
      preludes.push(prelude);
    });

    expect(
      preludes.map((prelude) => ({
        blockKind: prelude.blockKind,
        normalizedPrelude: prelude.normalizedPrelude,
        parentKind: prelude.parentKind,
      })),
    ).toEqual([
      {
        blockKind: "style",
        normalizedPrelude: '.foo[data-icon="{"]',
        parentKind: undefined,
      },
      {
        blockKind: "style",
        normalizedPrelude: ".bar",
        parentKind: "style",
      },
      {
        blockKind: "keyframes",
        normalizedPrelude: "@-webkit-keyframes spin",
        parentKind: undefined,
      },
      {
        blockKind: "style",
        normalizedPrelude: "from",
        parentKind: "keyframes",
      },
    ]);

    const roots = parseCssBlockTree(source);
    expect(roots.map((root) => root.normalizedPrelude)).toEqual([
      '.foo[data-icon="{"]',
      "@-webkit-keyframes spin",
    ]);
    expect(roots[0].children.map((child) => child.normalizedPrelude)).toEqual([".bar"]);
    expect(roots[1].children.map((child) => child.normalizedPrelude)).toEqual(["from"]);
  });

  test("forEachTopLevelTextRange preserves mixed declaration and nested-rule segments", () => {
    const source = `
.foo {
  color: red;
  @media (min-width: 1px) {
    .bar { color: blue; }
  }
  background: green;
  .baz { color: black; }
  border: 1px solid;
}
`;

    const block = parseCssBlockTree(source)[0];
    const segments: string[] = [];

    forEachTopLevelTextRange(block, (start, end) => {
      const text = source.slice(start, end);
      if (hasMeaningfulCssText(text)) {
        segments.push(text.trim());
      }
    });

    expect(segments).toEqual(["color: red;", "background: green;", "border: 1px solid;"]);
  });

  test("scopeSelectorPrelude handles nesting selectors, nested containers, and quoted attribute content", () => {
    expect(scopeSelectorPrelude("&:hover", "data-test")).toBe("&[data-test]:hover");
    expect(scopeSelectorPrelude(":is(.foo, :where(.bar, .baz))", "data-test")).toBe(
      ":is(.foo[data-test], :where(.bar[data-test], .baz[data-test]))",
    );
    expect(scopeSelectorPrelude(':where([data-kind="a,b"], .foo)', "data-test")).toBe(
      ':where([data-kind="a,b"][data-test], .foo[data-test])',
    );
  });

  test("scopeSelectorPrelude strips universal anchors and returns undefined for unsupported syntax", () => {
    expect(scopeSelectorPrelude("/* note */ *.foo", "data-test")).toBe(".foo[data-test]");
    expect(scopeSelectorPrelude("svg|a", "data-test")).toBeUndefined();
    expect(scopeSelectorPrelude("* + :hover", "data-test")).toBeUndefined();
  });

  test("rewriteCssSelectorSource preserves the original source when the direct path is a no-op", () => {
    const source = ".foo { color: red; }";

    expect(
      rewriteCssSelectorSource(source, {
        tryRewritePreludeDirect: (prelude) => prelude,
        appendRewrittenSelectors: () => {
          throw new Error("parsed fallback should not run for a no-op direct rewrite");
        },
      }),
    ).toBe(source);

    const map = { version: 3, sources: ["input.css"] };
    const result = rewriteCssSelectorSourceWithMap(
      source,
      "input.css",
      {
        tryRewritePreludeDirect: (prelude) => prelude,
        appendRewrittenSelectors: () => {
          throw new Error("parsed fallback should not run for a no-op direct rewrite");
        },
      },
      map,
    );

    expect(result).toEqual({ code: source, map });
  });

  test("rewriteCssSelectorSource forwards parserOptions to the parsed fallback", () => {
    let parsedSelector: Selector | undefined;

    const rewritten = rewriteCssSelectorSource(":current(.foo) { color: red; }", {
      tryRewritePreludeDirect: () => undefined,
      parserOptions: {
        selectorListFunctionNames: new Set(["current"]),
      },
      appendRewrittenSelectors: (selector, target) => {
        parsedSelector = selector;
        target.push(selector);
      },
    });

    expect(rewritten).toBe(":current(.foo){ color: red; }");
    expect(parsedSelector?.[0]).toMatchObject({
      type: "pseudo-class",
      kind: "custom-function",
      name: "current",
    });
  });

  test("rewriteCssSelectorSourceWithMap merges generated sourcemaps when the source changes", () => {
    const map = { version: 3, sources: ["input.css"], note: "existing" };
    const mergeMap = vi.fn((currentMap: typeof map, nextMap: object) => ({
      ...currentMap,
      merged: true,
      nextVersion: (nextMap as { version?: number }).version,
    }));

    const rewritten = rewriteCssSelectorSourceWithMap(
      ".foo { color: red; }",
      "input.css",
      {
        tryRewritePreludeDirect: (prelude) => scopeSelectorPrelude(prelude, "data-test"),
        appendRewrittenSelectors: () => {
          throw new Error("direct path should have handled this rewrite");
        },
      },
      map,
      mergeMap,
    );

    expect(rewritten.code).toBe(".foo[data-test]{ color: red; }");
    expect(mergeMap).toHaveBeenCalledTimes(1);
    expect(rewritten.map).toEqual({
      version: 3,
      sources: ["input.css"],
      note: "existing",
      merged: true,
      nextVersion: 3,
    });
  });

  test("rewriteCssSelectorSource allows filtering selectors while keeping valid output", () => {
    const rewritten = rewriteCssSelectorSource(".foo, .bar { color: red; }", {
      appendRewrittenSelectors: (selector, target) => {
        if (selector.some((component) => component.type === "class" && component.name === "foo")) {
          target.push(selector);
        }
      },
    });

    expect(rewritten).toBe(".foo{ color: red; }");
  });

  test("findLastNonWhitespaceIndex is pinned directly", () => {
    expect(findLastNonWhitespaceIndex("  foo \n\t")).toBe(4);
    expect(findLastNonWhitespaceIndex("   ")).toBe(-1);
  });
});
