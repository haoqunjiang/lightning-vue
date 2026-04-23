import { compileStyle as compileStyleWithPostcss } from "@vue/compiler-sfc";
import { compileStyleWithLightningCss } from "../src/compileStyle";
import { runSharedStyleCompileTests } from "./compileStyle.shared";
import { Features, transform } from "lightningcss";

runSharedStyleCompileTests("Lightning CSS", compileStyleWithLightningCss, {
  legacyVueScopedSyntax: false,
});

describe("compileStyleWithLightningCss", () => {
  function normalizeCssOutput(code: string) {
    return code
      .replace(/\[([^\]=]+)="\1"\]/g, "[$1]")
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalizeComparisonCss(code: string) {
    return normalizeCssOutput(code).replace(/\(\s+/g, "(").replace(/\s+\)/g, ")");
  }

  function flattenCss(code: string) {
    return new TextDecoder().decode(
      transform({
        filename: "test.css",
        code: new TextEncoder().encode(code),
        include: Features.Nesting,
        nonStandard: {
          deepSelectorCombinator: true,
        },
      }).code,
    );
  }

  function extractSelectors(code: string) {
    return Array.from(normalizeCssOutput(code).matchAll(/([^{}]+)\{/g), (match) =>
      normalizeSelector(match[1].trim()),
    );
  }

  function normalizeSelector(selector: string) {
    return selector
      .replace(/:nth-child\(2n\+1\)/g, ":nth-child(odd)")
      .replace(/:nth-child\(2n\)/g, ":nth-child(even)")
      .replace(/(^|[^:]):(before|after|first-letter|first-line)\b/g, "$1::$2");
  }

  test("throws for postcss plugins", () => {
    expect(() =>
      compileStyleWithLightningCss({
        source: `.foo { color: red; }`,
        filename: "test.css",
        id: "data-v-test",
        postcssPlugins: [{}],
      }),
    ).toThrow(/postcssPlugins/);
  });

  test("throws for unsupported postcss options", () => {
    expect(() =>
      compileStyleWithLightningCss({
        source: `.foo { color: red; }`,
        filename: "test.css",
        id: "data-v-test",
        postcssOptions: { parser: {} },
      }),
    ).toThrow(/postcssOptions/);
  });

  test.each([
    ["::v-deep alias", `::v-deep(.foo) { color: red; }`, /:deep/],
    [":v-deep alias", `:v-deep(.foo) { color: red; }`, /:deep/],
    ["::v-slotted alias", `::v-slotted(.foo) { color: red; }`, /:slotted/],
    [":v-slotted alias", `:v-slotted(.foo) { color: red; }`, /:slotted/],
    ["::v-global alias", `::v-global(.foo) { color: red; }`, /:global/],
    [":v-global alias", `:v-global(.foo) { color: red; }`, /:global/],
    [">>> combinator", `.foo >>> .bar { color: red; }`, /:deep/],
    ["/deep/ combinator", `.foo /deep/ .bar { color: red; }`, /:deep/],
    ["::v-deep combinator", `.foo ::v-deep .bar { color: red; }`, /:deep/],
  ])("rejects legacy scoped syntax: %s", (_label, source, expected) => {
    const result = compileStyleWithLightningCss({
      source,
      filename: "test.css",
      id: "data-v-test",
      scoped: true,
    });

    expect(result.code).toBe("");
    expect(result.errors).toHaveLength(1);
    expect(String(result.errors[0])).toMatch(expected);
  });

  test("supports postcss map output options", () => {
    const res = compileStyleWithLightningCss({
      source: `.foo { color: red; }`,
      filename: "test.css",
      id: "data-v-test",
      postcssOptions: {
        map: {
          from: "test.css",
          inline: false,
          annotation: false,
        },
      },
    });

    expect(res.errors).toHaveLength(0);
    expect(normalizeCssOutput(res.code)).toBe(".foo { color: red; }");
    expect(res.map).toBeDefined();
  });

  test("matches compileStyle for namespace selectors", () => {
    const source = `svg|a { color: red; } svg|a .icon { color: blue; }`;
    expectLightningCssToMatchCompileStyle(source);
  });

  test.each([
    ["escaped class selector", `.foo\\:bar { color: red; }`],
    ["escaped type selector", `.a \\31 23item { color: red; }`],
    [":lang() selector", `:lang(en) { color: red; }`],
    [":nth-child() selector", `:nth-child(2n+1) { color: red; }`],
    ["::part() selector", `::part(tab) { color: red; }`],
    ["wildcard pseudo selector", `*:hover { color: red; }`],
    ["wildcard pseudo-element selector", `*::before { color: red; }`],
    ["slotted wildcard pseudo selector", `:slotted(*:hover) { color: red; }`],
    ["global wildcard selector", `:global(*) { color: red; }`],
  ])("matches compileStyle for %s", (_label, source) => {
    expectLightningCssToMatchCompileStyle(source);
  });

  test.each([
    [
      "global hover suffix",
      `:global(.btn):hover { color: red; }`,
      /\.btn:hover\s*\{\s*color: red;\s*\}/,
    ],
    [
      "global pseudo-element suffix",
      `:global(.btn)::before { content: "x"; }`,
      /\.btn::?before\s*\{\s*content: "x";\s*\}/,
    ],
  ])("preserves selector suffixes after %s", (_label, source, expected) => {
    const result = compileStyleWithLightningCss({
      source,
      filename: "test.css",
      id: "data-v-test",
      scoped: true,
    });

    expect(result.errors).toHaveLength(0);
    expect(normalizeCssOutput(result.code)).toMatch(expected);
  });

  test.todo(
    "Vue carriers inside :nth-child(... of ...)/:nth-last-child(... of ...) are not rewritten yet: :nth-child(2 of :global(.foo)), :nth-child(2 of :deep(.bar)), :nth-last-child(odd of :slotted(.x)) { color: red; }",
  );

  test.todo(
    "@scope root/limit selectors are not scoped yet; this currently matches the PostCSS compiler limitation: @scope (.foo) { .bar { color: red; } }",
  );

  test("v-bind preserves single-quoted raw expression spelling", () => {
    const source = `.foo { top: calc(v-bind(foo + 'px') - 3px); }`;
    const postcssResult = compileStyleWithPostcss({
      source,
      filename: "test.css",
      id: "data-v-test",
      scoped: true,
    });
    const lightningResult = compileStyleWithLightningCss({
      source,
      filename: "test.css",
      id: "data-v-test",
      scoped: true,
    });

    expect(postcssResult.errors).toHaveLength(0);
    expect(lightningResult.errors).toHaveLength(0);
    expect(normalizeCssOutput(lightningResult.code)).toBe(normalizeCssOutput(postcssResult.code));
  });

  test("v-bind allows whitespace before the opening paren", () => {
    const source = `.foo { color: v-bind    ((a + b) / 2 + 'px' ); }`;
    const postcssResult = compileStyleWithPostcss({
      source,
      filename: "test.css",
      id: "data-v-test",
      scoped: true,
    });
    const lightningResult = compileStyleWithLightningCss({
      source,
      filename: "test.css",
      id: "data-v-test",
      scoped: true,
    });

    expect(postcssResult.errors).toHaveLength(0);
    expect(lightningResult.errors).toHaveLength(0);
    expect(normalizeCssOutput(lightningResult.code)).toBe(normalizeCssOutput(postcssResult.code));
    expect(lightningResult.code).not.toContain("v-bind");
  });

  test("comment-bearing fallback selectors stay scoped after parsed rewrite", () => {
    const source = `
:global(.x) { color: red; }
.foo/* comment */.bar { color: blue; }
`;

    const postcssResult = compileStyleWithPostcss({
      source,
      filename: "test.css",
      id: "data-v-test",
      scoped: true,
    });
    const lightningResult = compileStyleWithLightningCss({
      source,
      filename: "test.css",
      id: "data-v-test",
      scoped: true,
    });

    expect(postcssResult.errors).toHaveLength(0);
    expect(lightningResult.errors).toHaveLength(0);
    expect(normalizeCssOutput(lightningResult.code)).toContain(".foo.bar[data-v-test] {");
  });

  test("brace-valued custom properties do not trigger false nesting normalization", () => {
    const source = `.foo { --theme: { color: red; }; color: blue; }`;
    const postcssResult = compileStyleWithPostcss({
      source,
      filename: "test.css",
      id: "data-v-test",
      scoped: true,
    });
    const lightningResult = compileStyleWithLightningCss({
      source,
      filename: "test.css",
      id: "data-v-test",
      scoped: true,
    });

    expect(postcssResult.errors).toHaveLength(0);
    expect(lightningResult.errors).toHaveLength(0);
    expect(normalizeCssOutput(lightningResult.code)).toContain(".foo[data-v-test] {");
    expect(normalizeCssOutput(lightningResult.code)).toContain("--theme: { color: red; };");
    expect(lightningResult.code).not.toContain("& {");
  });

  test("brace-valued custom properties do not break later nested rule normalization", () => {
    const source = `
.foo {
  --theme: { color: red; };
  .bar { color: blue; }
}
`;
    const postcssResult = compileStyleWithPostcss({
      source,
      filename: "test.css",
      id: "data-v-test",
      scoped: true,
    });
    const lightningResult = compileStyleWithLightningCss({
      source,
      filename: "test.css",
      id: "data-v-test",
      scoped: true,
    });

    expect(postcssResult.errors).toHaveLength(0);
    expect(lightningResult.errors).toHaveLength(0);
    const normalized = normalizeCssOutput(flattenCss(lightningResult.code));
    expect(normalized).toContain(".foo[data-v-test] { --theme: { color: red; };");
    expect(normalized).toContain(".foo .bar[data-v-test] {");
    expect(lightningResult.code).not.toContain("&");
  });

  test("quoted @keyframes names are scoped with matching animation-name rewrites", () => {
    const result = compileStyleWithLightningCss({
      source: `
.anim {
  animation-name: "fade";
}
@keyframes "fade" {
  from { opacity: 0; }
  to { opacity: 1; }
}
`,
      filename: "test.css",
      id: "data-v-test",
      scoped: true,
    });

    expect(result.errors).toHaveLength(0);
    const normalized = normalizeCssOutput(result.code);
    expect(normalized).toContain(".anim[data-v-test] { animation-name: fade-test;");
    expect(normalized).toContain("@keyframes fade-test {");
  });

  test("escaped keyframe names stay aligned with rewritten animation declarations", () => {
    const result = compileStyleWithLightningCss({
      source: `
.anim {
  animation: foo\\:bar 1s;
}
@keyframes foo\\:bar {
  from { opacity: 0; }
  to { opacity: 1; }
}
`,
      filename: "test.css",
      id: "data-v-test",
      scoped: true,
    });

    expect(result.errors).toHaveLength(0);
    const normalized = normalizeCssOutput(result.code);
    expect(normalized).toContain(".anim[data-v-test] { animation:");
    expect(normalized).toContain("foo\\:bar-test");
    expect(normalized).toContain("@keyframes foo\\:bar-test {");
  });

  test.each([
    [
      "quoted animation-name values",
      `
.anim {
  animation-name: "foo";
}
@keyframes foo {
  from { opacity: 0; }
  to { opacity: 1; }
}
`,
    ],
    [
      "animation shorthands whose keywords collide with local keyframe names",
      `
.anim {
  animation: paused foo 1s;
}
@keyframes paused {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes foo {
  from { color: red; }
  to { color: blue; }
}
`,
    ],
  ])("uses CSS-aware keyframe-name rewriting for %s", (_label, source) => {
    const lightningResult = compileStyleWithLightningCss({
      source,
      filename: "test.css",
      id: "data-v-test",
      scoped: true,
    });

    expect(lightningResult.errors).toHaveLength(0);
    const normalized = normalizeCssOutput(lightningResult.code);
    if (source.includes("animation-name")) {
      expect(normalized).toContain("animation-name: foo-test");
      expect(normalized).not.toContain('animation-name: "foo"');
    } else {
      const animationValue = normalized
        .match(/\.anim\[data-v-test\] \{[^}]*animation:([^;}]+);/)?.[1]
        ?.trim();
      expect(animationValue).toContain("foo-test");
      expect(animationValue).toContain("paused");
      expect(animationValue).not.toContain("paused-test");
    }
  });

  test.each([
    [
      "var()-driven animation-name",
      `
.anim {
  animation-name: var(--anim-name);
}
@keyframes color {
  from { opacity: 0; }
  to { opacity: 1; }
}
`,
    ],
    [
      "v-bind()-driven animation shorthand",
      `
.anim {
  animation: v-bind(animName) 1s linear;
}
@keyframes color {
  from { opacity: 0; }
  to { opacity: 1; }
}
`,
    ],
  ])("compiles scoped keyframes with %s", (_label, source) => {
    const postcssResult = compileStyleWithPostcss({
      source,
      filename: "test.css",
      id: "data-v-test",
      scoped: true,
    });
    const lightningResult = compileStyleWithLightningCss({
      source,
      filename: "test.css",
      id: "data-v-test",
      scoped: true,
    });

    expect(postcssResult.errors).toHaveLength(0);
    expect(lightningResult.errors).toHaveLength(0);
    expect(lightningResult.code).not.toBe("");
    expect(normalizeCssOutput(lightningResult.code)).toContain("@keyframes color-test {");
  });

  test("does not rewrite keyframe references in unscoped styles", () => {
    const result = compileStyleWithLightningCss({
      source: `
.anim {
  animation-name: fade;
}
@keyframes fade {
  from { opacity: 0; }
  to { opacity: 1; }
}
`,
      filename: "test.css",
      id: "data-v-test",
      scoped: false,
    });

    expect(result.errors).toHaveLength(0);
    const normalized = normalizeCssOutput(result.code);
    expect(normalized).toContain(".anim { animation-name: fade; }");
    expect(normalized).toContain("@keyframes fade {");
    expect(normalized).not.toContain("fade-test");
  });

  test.each([
    [
      "mixed-case animation property",
      `
.anim {
  Animation: foo 1s linear;
}
@keyframes foo {
  from { opacity: 0; }
  to { opacity: 1; }
}
`,
    ],
    [
      "mixed-case animation-name property",
      `
.anim {
  Animation-Name: foo;
}
@keyframes foo {
  from { opacity: 0; }
  to { opacity: 1; }
}
`,
    ],
    [
      "mixed-case vendor-prefixed animation property",
      `
.anim {
  -Webkit-Animation: foo 1s linear;
}
@keyframes foo {
  from { opacity: 0; }
  to { opacity: 1; }
}
`,
    ],
  ])("%s rewrites keyframe references", (_label, source) => {
    const postcssResult = compileStyleWithPostcss({
      source,
      filename: "test.css",
      id: "data-v-test",
      scoped: true,
    });
    const lightningResult = compileStyleWithLightningCss({
      source,
      filename: "test.css",
      id: "data-v-test",
      scoped: true,
    });

    expect(postcssResult.errors).toHaveLength(0);
    expect(lightningResult.errors).toHaveLength(0);
    expect(normalizeCssOutput(postcssResult.code)).toContain("@keyframes foo-test {");
    expect(normalizeCssOutput(lightningResult.code)).toContain("@keyframes foo-test {");
    expect(normalizeCssOutput(lightningResult.code)).toContain("foo-test");
  });

  test.each([
    [
      "keyword timing-function names stay as timing functions",
      `
.anim {
  animation: ease 1s, linear 2s;
}
@keyframes ease {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes linear {
  from { opacity: 0; }
  to { opacity: 1; }
}
`,
      ["animation: none, none"],
    ],
    [
      "dynamic shorthands with a trailing local keyframe name",
      `
.anim {
  animation: var(--anim) 1s foo;
}
@keyframes foo {
  from { opacity: 0; }
  to { opacity: 1; }
}
`,
      ["foo-test"],
    ],
  ])("rewrites %s in animation shorthands", (_label, source, expectedFragments) => {
    const result = compileStyleWithLightningCss({
      source,
      filename: "test.css",
      id: "data-v-test",
      scoped: true,
    });

    expect(result.errors).toHaveLength(0);
    const normalized = normalizeCssOutput(result.code);
    for (const fragment of expectedFragments) {
      expect(normalized).toContain(fragment);
    }
  });

  test.each([
    [
      "wildcard sibling pseudo selector",
      `* + :hover { color: red; }`,
      `* + [data-v-test]:hover { color: red; }`,
    ],
    ["wildcard namespace selector", `svg|* { color: red; }`, `svg|*[data-v-test] { color: red; }`],
  ])("%s compiles to a valid scoped selector", (_label, source, expected) => {
    const result = compileStyleWithLightningCss({
      source,
      filename: "test.css",
      id: "data-v-test",
      scoped: true,
    });

    expect(result.errors).toHaveLength(0);
    expect(normalizeCssOutput(result.code)).toBe(expected);
  });

  test("does not leak internal deep markers for descendant-side nested deep selectors", () => {
    const source = `.card :is(.header :deep(.icon)) { color: red; }`;
    const result = compileStyleWithLightningCss({
      source,
      filename: "test.css",
      id: "data-v-test",
      scoped: true,
    });

    expect(result.errors).toHaveLength(0);
    expect(result.code).not.toContain("__VUE_SCOPE_DEEP__");
    const normalized = normalizeCssOutput(result.code);
    expect(normalized).toContain(".icon");
    expect(normalized).toContain(".header[data-v-test]");
    expect(normalized).toContain(".card[data-v-test]");
  });

  test.each([
    [
      "single deep branch inside descendant-side :is() becomes a descendant selector",
      `.card :is(:deep(.title)) { color: red; }`,
      ".card[data-v-test] .title { color: red; }",
    ],
    [
      "local prefix before deep inside descendant-side :is() stays scoped inside the branch",
      `.card :is(.header :deep(.icon)) { color: red; }`,
      ".card[data-v-test] :is(.header[data-v-test] .icon) { color: red; }",
    ],
    [
      "multiple deep branches inside descendant-side :is() stay descendants of the local anchor",
      `.card :is(:deep(.title), :deep(.eyebrow)) { color: red; }`,
      ".card[data-v-test] :is(.title, .eyebrow) { color: red; }",
    ],
    [
      "deep-only :where() inside descendant-side :is() stays a descendant branch",
      `.card :is(:where(:deep(.title))) { color: red; }`,
      ".card[data-v-test] :where(.title) { color: red; }",
    ],
    [
      "single deep branch inside descendant-side :where() becomes a descendant selector",
      `.card :where(:deep(.title)) { color: red; }`,
      ".card[data-v-test] :where(.title) { color: red; }",
    ],
    [
      "local prefix before deep inside descendant-side :where() stays scoped inside the branch",
      `.card :where(.header :deep(.icon)) { color: red; }`,
      ".card[data-v-test] :where(.header[data-v-test] .icon) { color: red; }",
    ],
  ])("%s", (_label, source, expected) => {
    const result = compileStyleWithLightningCss({
      source,
      filename: "test.css",
      id: "data-v-test",
      scoped: true,
    });

    expect(result.errors).toHaveLength(0);
    expect(normalizeCssOutput(result.code)).toBe(expected);
  });

  test.each([
    [
      "descendant-side deep-only :is() now lowers the nested deep branch",
      `.card :is(:deep(.title)) { color: red; }`,
      ".card[data-v-test] :is(.title) { color: red; }",
      ".card[data-v-test] .title { color: red; }",
    ],
    [
      "descendant-side deep inside :is() still leaves local prefixes unscoped in the current PostCSS path",
      `.card :is(.header :deep(.icon)) { color: red; }`,
      ".card[data-v-test] :is(.header .icon) { color: red; }",
      ".card[data-v-test] :is(.header[data-v-test] .icon) { color: red; }",
    ],
    [
      "descendant-side :is(:where(:deep(...))) still differs after the carrier is lowered",
      `.card :is(:where(:deep(.title))) { color: red; }`,
      ".card[data-v-test] :is(:where(.title)) { color: red; }",
      ".card[data-v-test] :where(.title) { color: red; }",
    ],
    [
      "wrapped :deep() selectors now lower the inner deep branch but still miss the outer local anchor",
      `:not(.foo :deep(.bar)) { color: red; }`,
      ":not(.foo[data-v-test] .bar) { color: red; }",
      ":not(.foo[data-v-test] .bar)[data-v-test] { color: red; }",
    ],
    [
      "leading deep branches inside wrapped :deep() selectors now rewrite but still scope a different side",
      `:not(:deep(.foo)) .bar { color: red; }`,
      ":not([data-v-test] .foo) .bar { color: red; }",
      ":not(.foo) .bar[data-v-test] { color: red; }",
    ],
  ])("%s", (_label, source, postcssExpected, lightningExpected) => {
    const options = {
      source,
      filename: "test.css",
      id: "data-v-test",
      scoped: true,
    };

    const postcssResult = compileStyleWithPostcss(options);
    const lightningResult = compileStyleWithLightningCss(options);

    expect(postcssResult.errors).toHaveLength(0);
    expect(lightningResult.errors).toHaveLength(0);
    expect(normalizeComparisonCss(postcssResult.code)).toBe(postcssExpected);
    expect(normalizeComparisonCss(lightningResult.code)).toBe(lightningExpected);
  });

  test.each([
    [
      "deep inside :not()",
      `:not(.foo :deep(.bar)) { color: red; }`,
      ":not(.foo[data-v-test] .bar)[data-v-test] { color: red; }",
    ],
    [
      "deep inside :has()",
      `:has(.foo :deep(.bar)) { color: red; }`,
      ":has(.foo[data-v-test] .bar)[data-v-test] { color: red; }",
    ],
  ])("rewrites %s without losing scope on the local branch", (_label, source, expected) => {
    const result = compileStyleWithLightningCss({
      source,
      filename: "test.css",
      id: "data-v-test",
      scoped: true,
    });

    expect(result.errors).toHaveLength(0);
    expect(normalizeCssOutput(result.code)).toBe(expected);
  });

  test.each([
    [
      "deep inside :has() keeps an outer scope anchor",
      `:has(:deep(.child)) { color: red; }`,
      ":has([data-v-test] .child)[data-v-test] { color: red; }",
    ],
    [
      "slotted inside :not() keeps an outer scope anchor",
      `:not(:slotted(.x)) { color: red; }`,
      ":not(.x[data-v-test-s])[data-v-test] { color: red; }",
    ],
  ])("%s", (_label, source, expected) => {
    const result = compileStyleWithLightningCss({
      source,
      filename: "test.css",
      id: "data-v-test",
      scoped: true,
    });

    expect(result.errors).toHaveLength(0);
    expect(normalizeCssOutput(result.code)).toBe(expected);
  });

  test.each([
    [
      "global inside :not()",
      `:not(:global(.x)) { color: red; }`,
      ":not(.x)[data-v-test] { color: red; }",
    ],
    ["global inside :where()", `:where(:global(.x)) { color: red; }`, ":where(.x) { color: red; }"],
    [
      "mixed local and global branches inside :is()",
      `:is(.foo, :global(.x)) { color: red; }`,
      ":is(.foo[data-v-test], .x) { color: red; }",
    ],
    [
      "mixed local and global branches inside :where()",
      `:where(.foo, :global(.x)) { color: red; }`,
      ":where(.foo[data-v-test], .x) { color: red; }",
    ],
    [
      "global inside :has()",
      `:has(:global(.x)) { color: red; }`,
      ":has(.x)[data-v-test] { color: red; }",
    ],
  ])("%s keeps the outer selector scoped", (_label, source, expected) => {
    const result = compileStyleWithLightningCss({
      source,
      filename: "test.css",
      id: "data-v-test",
      scoped: true,
    });

    expect(result.errors).toHaveLength(0);
    expect(normalizeCssOutput(result.code)).toBe(expected);
  });

  test("global inside :is() keeps the global branch unscoped", () => {
    const result = compileStyleWithLightningCss({
      source: `:is(:global(.x)) { color: red; }`,
      filename: "test.css",
      id: "data-v-test",
      scoped: true,
    });

    expect(result.errors).toHaveLength(0);

    const code = normalizeCssOutput(result.code);

    // Single-branch `:is(...)` is printer-dependent here: preserving
    // `:is(.x)` and simplifying it to `.x` are both semantically correct.
    expect([".x { color: red; }", ":is(.x) { color: red; }"]).toContain(code);
  });

  test.each([
    ["slotted inside :is()", `:is(:slotted(.x)) { color: red; }`],
    ["slotted inside :where()", `:where(:slotted(.x)) { color: red; }`],
  ])("%s does not add an extra local scope attribute", (_label, source) => {
    const result = compileStyleWithLightningCss({
      source,
      filename: "test.css",
      id: "data-v-test",
      scoped: true,
    });

    expect(result.errors).toHaveLength(0);
    const normalized = normalizeCssOutput(result.code);
    expect(normalized).toContain(".x[data-v-test-s]");
    expect(normalized).not.toMatch(/\.x\[data-v-test-s\]\[data-v-test\]/);
  });

  test("global wrappers keep nested :is() branches fully unscoped", () => {
    const result = compileStyleWithLightningCss({
      source: `:global(.a:is(.b)) { color: red; }`,
      filename: "test.css",
      id: "data-v-test",
      scoped: true,
    });

    expect(result.errors).toHaveLength(0);

    const code = normalizeCssOutput(result.code);
    expect(code).not.toContain("[data-v-test]");

    // Single-branch `:is(...)` may be preserved or simplified to a compound
    // selector, but either way the global wrapper should prevent any local
    // scope attribute from appearing in the nested branch.
    expect([".a:is(.b) { color: red; }", ".a.b { color: red; }"]).toContain(code);
  });

  test("slotted wrappers keep nested :is() branches in slot context only", () => {
    const result = compileStyleWithLightningCss({
      source: `:slotted(.a:is(.b)) { color: red; }`,
      filename: "test.css",
      id: "data-v-test",
      scoped: true,
    });

    expect(result.errors).toHaveLength(0);

    const code = normalizeCssOutput(result.code);
    expect(code).not.toContain("[data-v-test]");

    // Single-branch `:is(...)` may be preserved or simplified here too; the
    // important invariant is that only the slot scope attribute is applied.
    expect([
      ".a:is(.b)[data-v-test-s] { color: red; }",
      ".a.b[data-v-test-s] { color: red; }",
      ".a[data-v-test-s].b { color: red; }",
    ]).toContain(code);
  });

  test("plain local :is() branches stay untouched when a later :deep() triggers expansion", () => {
    const result = compileStyleWithLightningCss({
      source: `.a:is(.b).c :deep(.d) { color: red; }`,
      filename: "test.css",
      id: "data-v-test",
      scoped: true,
    });

    expect(result.errors).toHaveLength(0);

    const code = normalizeCssOutput(result.code);
    expect(code).not.toContain(".b[data-v-test]");

    // Single-branch `:is(...)` may simplify, but the local branch itself should
    // not pick up an extra scope attribute just because a later `:deep(...)`
    // moved the injection anchor to `.c`.
    expect([
      ".a:is(.b).c[data-v-test] .d { color: red; }",
      ".a.b.c[data-v-test] .d { color: red; }",
    ]).toContain(code);
  });

  test("mixed global and local branches inside nested :is() keep the local branch specificity unchanged", () => {
    const result = compileStyleWithLightningCss({
      source: `.a:is(:global(.b), .c) { color: red; }`,
      filename: "test.css",
      id: "data-v-test",
      scoped: true,
    });

    expect(result.errors).toHaveLength(0);
    expect(normalizeCssOutput(result.code)).toBe(".a[data-v-test]:is(.b, .c) { color: red; }");
  });

  test("mixed global and local branches stay untouched when a later anchor takes the scope attribute", () => {
    const result = compileStyleWithLightningCss({
      source: `.a:is(:global(.b), .c).d :deep(.e) { color: red; }`,
      filename: "test.css",
      id: "data-v-test",
      scoped: true,
    });

    expect(result.errors).toHaveLength(0);

    const code = normalizeCssOutput(result.code);
    expect(code).not.toContain(".c[data-v-test]");
    expect(code).toBe(".a:is(.b, .c).d[data-v-test] .e { color: red; }");
  });

  test("nested :is(:global(...)) does not re-scope the outer local branch", () => {
    const result = compileStyleWithLightningCss({
      source: `.a:is(.b:is(:global(.c))) { color: red; }`,
      filename: "test.css",
      id: "data-v-test",
      scoped: true,
    });

    expect(result.errors).toHaveLength(0);

    const code = normalizeCssOutput(result.code);
    expect(code).not.toContain(".b[data-v-test]");
    expect(code).not.toContain(".c[data-v-test]");
    expect(code).toContain(".a[data-v-test]");
  });

  test.each([
    [
      "nested style rules with mixed declarations and at-rules",
      `h1 {
  color: red;
  @media only screen and (max-width: 800px) {
    background-color: green;
    .bar { color: white; }
  }
  .foo { color: red; }
}`,
    ],
    [
      "deep nested rules inside media queries",
      `:deep(.foo) {
  color: red;
  @media only screen and (max-width: 800px) {
    color: blue;
    .bar { color: white; }
  }
}`,
    ],
    [
      "explicit nesting selectors",
      `.card {
  color: red;
  &.active { color: blue; }
  > .title { color: green; }
}`,
    ],
  ])("matches compileStyle for %s after nesting is lowered", (_label, source) => {
    expectFlattenedLightningCssToMatchCompileStyle(source);
  });

  test("logical pseudos with deep keep nested descendants scoped", () => {
    const result = compileStyleWithLightningCss({
      source: `:not(:deep(.foo)) {
  .bar { color: red; }
}`,
      filename: "test.css",
      id: "data-v-test",
      scoped: true,
    });

    expect(result.errors).toHaveLength(0);
    expect(normalizeCssOutput(flattenCss(result.code))).toBe(
      ":not(.foo) .bar[data-v-test] { color: red; }",
    );
  });

  test("slotted selectors keep nested descendants in slot context", () => {
    const result = compileStyleWithLightningCss({
      source: `:slotted(.x) {
  .y { color: red; }
}`,
      filename: "test.css",
      id: "data-v-test",
      scoped: true,
    });

    expect(result.errors).toHaveLength(0);
    expect(normalizeCssOutput(flattenCss(result.code))).toBe(
      ".x[data-v-test-s] .y { color: red; }",
    );
  });

  test("standard ::slotted() stays an ordinary pseudo-element for nested rules", () => {
    const result = compileStyleWithLightningCss({
      source: `::slotted(.x) {
  .y { color: red; }
}`,
      filename: "test.css",
      id: "data-v-test",
      scoped: true,
    });

    expect(result.errors).toHaveLength(0);
    expect(normalizeCssOutput(result.code)).toBe("::slotted(.x) .y[data-v-test] { color: red; }");
  });

  test.each([
    [
      "mixed slotted and local branches",
      `:slotted(.x), .y {
  .b { color: red; }
}`,
    ],
    [
      "mixed deep and local branches",
      `:deep(.x), .y {
  .b { color: red; }
}`,
    ],
  ])("%s conservatively keeps nested descendants scoped", (_label, source) => {
    const result = compileStyleWithLightningCss({
      source,
      filename: "test.css",
      id: "data-v-test",
      scoped: true,
    });

    expect(result.errors).toHaveLength(0);
    expect(normalizeCssOutput(flattenCss(result.code))).toContain(
      ".b[data-v-test] { color: red; }",
    );
  });

  test.each([
    [
      "deep context through :is()",
      `.shell :is(:deep(.foo)) {
  .bar { color: red; }
}`,
      ".bar[data-v-test]",
    ],
    [
      "slot context through :where()",
      `:where(:slotted(.x)) {
  .y { color: red; }
}`,
      ".y[data-v-test]",
    ],
  ])("%s is preserved for nested descendants", (_label, source, forbidden) => {
    const result = compileStyleWithLightningCss({
      source,
      filename: "test.css",
      id: "data-v-test",
      scoped: true,
    });

    expect(result.errors).toHaveLength(0);
    const normalized = normalizeCssOutput(flattenCss(result.code));
    expect(normalized).not.toContain(forbidden);
    if (source.includes(":deep(")) {
      expect(normalized).toContain(".bar { color: red; }");
    } else {
      expect(normalized).toContain(".x[data-v-test-s]");
      expect(normalized).toContain(".y { color: red; }");
    }
  });

  test("slotted selectors carry slot context through nested at-rules", () => {
    const result = compileStyleWithLightningCss({
      source: `:slotted(.x) {
  @media print {
    .b { color: red; }
  }
}`,
      filename: "test.css",
      id: "data-v-test",
      scoped: true,
    });

    expect(result.errors).toHaveLength(0);
    expect(normalizeCssOutput(flattenCss(result.code))).toBe(
      "@media print { .x[data-v-test-s] .b { color: red; } }",
    );
  });

  test("mixed declarations and nested rules keep top-level :global() declarations global", () => {
    const result = compileStyleWithLightningCss({
      source: `:global(.foo) {
  color: red;
  .bar { color: blue; }
}`,
      filename: "test.css",
      id: "data-v-test",
      scoped: true,
    });

    expect(result.errors).toHaveLength(0);
    const normalized = normalizeCssOutput(flattenCss(result.code));
    expect(normalized).toContain(".foo { color: red; }");
    expect(normalized).toContain(".foo .bar[data-v-test] { color:");
    expect(normalized).not.toContain(".foo[data-v-test] { color:");
  });

  test("leading universal selector is preserved before child and sibling combinators", () => {
    expect(
      normalizeCssOutput(
        compileStyleWithLightningCss({
          source: `* + .foo { color: red; }`,
          filename: "test.css",
          id: "data-v-test",
          scoped: true,
        }).code,
      ),
    ).toBe(`* + .foo[data-v-test] { color: red; }`);
    expect(
      normalizeCssOutput(
        compileStyleWithLightningCss({
          source: `* > .foo { color: red; }`,
          filename: "test.css",
          id: "data-v-test",
          scoped: true,
        }).code,
      ),
    ).toBe(`* > .foo[data-v-test] { color: red; }`);
    expect(
      normalizeCssOutput(
        compileStyleWithLightningCss({
          source: `* ~ .foo { color: red; }`,
          filename: "test.css",
          id: "data-v-test",
          scoped: true,
        }).code,
      ),
    ).toBe(`* ~ .foo[data-v-test] { color: red; }`);
  });

  test.each([
    [
      "nested :not() deep argument",
      `:not(.foo :deep(.bar)) {
  .baz { color: red; }
}`,
      ":not(.foo .bar) .baz[data-v-test] { color: red; }",
    ],
    [
      "nested :has() deep argument",
      `:has(.foo :deep(.bar)) {
  .baz { color: red; }
}`,
      ":has(.foo .bar) .baz[data-v-test] { color: red; }",
    ],
  ])("%s keeps nested descendants scoped", (_label, source, expected) => {
    const result = compileStyleWithLightningCss({
      source,
      filename: "test.css",
      id: "data-v-test",
      scoped: true,
    });

    expect(result.errors).toHaveLength(0);
    expect(normalizeCssOutput(flattenCss(result.code))).toBe(expected);
  });

  test.each([
    [
      "nested deep carriers",
      `:deep(.a) {
  .b { color: red; }
}`,
    ],
    [
      "nested global carriers",
      `.a {
  :global(.b) { color: red; }
}`,
    ],
  ])("matches compileStyle for %s when sourcemaps are enabled", (_label, source) => {
    const baseOptions = {
      source,
      filename: "test.css",
      id: "data-v-test",
      scoped: true,
      postcssOptions: {
        map: {
          from: "test.css",
          inline: false,
          annotation: false,
        },
      },
    };

    const postcssResult = compileStyleWithPostcss(baseOptions);
    const lightningResult = compileStyleWithLightningCss(baseOptions);

    expect(postcssResult.errors).toHaveLength(0);
    expect(lightningResult.errors).toHaveLength(0);
    expect(lightningResult.map).toBeDefined();
    expect(normalizeCssOutput(flattenCss(lightningResult.code))).toBe(
      normalizeCssOutput(flattenCss(postcssResult.code)),
    );
  });

  test("matches compileStyle sourcemap shape for preprocessed styles requested via postcssOptions.map", () => {
    const baseOptions = {
      source: `$color: red;\n.foo { color: $color; }\n`,
      filename: "test.scss",
      id: "data-v-test",
      scoped: true,
      preprocessLang: "scss" as const,
      postcssOptions: {
        map: {
          from: "test.scss",
          inline: false,
          annotation: false,
        },
      },
    };

    const postcssResult = compileStyleWithPostcss(baseOptions);
    const lightningResult = compileStyleWithLightningCss(baseOptions);

    expect(postcssResult.errors).toHaveLength(0);
    expect(lightningResult.errors).toHaveLength(0);
    expect(lightningResult.map).toBeDefined();
    expect(normalizeCssOutput(lightningResult.code)).toBe(normalizeCssOutput(postcssResult.code));
    expect(lightningResult.map?.sources).toContain("test.scss");
    expect(lightningResult.map?.sources.some((source) => /[/\\]test\.scss$/.test(source))).toBe(
      true,
    );
  });

  test("less preprocessing keeps filename for relative import resolution", () => {
    let receivedFilename: string | undefined;
    const filename = "/virtual/components/example.less";
    const result = compileStyleWithLightningCss({
      source: `.foo { color: red; }`,
      filename,
      id: "data-v-test",
      preprocessLang: "less",
      preprocessCustomRequire(id) {
        expect(id).toBe("less");
        return {
          render(
            _source: string,
            options: Record<string, unknown>,
            callback: (err: Error | null, output: any) => void,
          ) {
            receivedFilename = options.filename as string | undefined;
            callback(null, {
              css: `.foo { color: red; }`,
              imports: [],
              map: undefined,
            });
          },
        };
      },
    });

    expect(result.errors).toHaveLength(0);
    expect(receivedFilename).toBe(filename);
  });

  test("stylus preprocessing keeps filename for relative import resolution", () => {
    let receivedFilename: string | undefined;
    const filename = "/virtual/components/example.styl";
    const result = compileStyleWithLightningCss({
      source: `.foo\n  color red\n`,
      filename,
      id: "data-v-test",
      preprocessLang: "stylus",
      preprocessCustomRequire(id) {
        expect(id).toBe("stylus");
        return (input: string, options: Record<string, unknown>) => {
          receivedFilename = options.filename as string | undefined;
          return {
            deps() {
              return [];
            },
            render() {
              return `.foo { color: red; }`;
            },
            set() {},
          };
        };
      },
    });

    expect(result.errors).toHaveLength(0);
    expect(receivedFilename).toBe(filename);
  });

  function expectLightningCssToMatchCompileStyle(source: string) {
    const baseOptions = {
      source,
      filename: "test.css",
      id: "data-v-test",
      scoped: true,
    };

    const postcssResult = compileStyleWithPostcss(baseOptions);
    const lightningResult = compileStyleWithLightningCss(baseOptions);

    expect(postcssResult.errors).toHaveLength(0);
    expect(lightningResult.errors).toHaveLength(0);
    expect(extractSelectors(lightningResult.code)).toEqual(extractSelectors(postcssResult.code));
  }

  function expectFlattenedLightningCssToMatchCompileStyle(source: string) {
    const baseOptions = {
      source,
      filename: "test.css",
      id: "data-v-test",
      scoped: true,
    };

    const postcssResult = compileStyleWithPostcss(baseOptions);
    const lightningResult = compileStyleWithLightningCss(baseOptions);

    expect(postcssResult.errors).toHaveLength(0);
    expect(lightningResult.errors).toHaveLength(0);
    expect(normalizeCssOutput(flattenCss(lightningResult.code))).toBe(
      normalizeCssOutput(flattenCss(postcssResult.code)),
    );
  }
});
