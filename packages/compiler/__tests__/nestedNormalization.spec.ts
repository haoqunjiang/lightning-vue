import { Features, transform } from "lightningcss";
import { compileStyleWithLightningCss } from "../src/compileStyle";

function normalizeCssOutput(code: string) {
  return code
    .replace(/\[([^\]=]+)="\1"\]/g, "[$1]")
    .replace(/\s+/g, " ")
    .trim();
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

describe("nested style normalization", () => {
  test("keeps local keyframes aligned with rewritten declarations", () => {
    const result = compileStyleWithLightningCss({
      source: `
.card {
  animation: fade 1s linear;
  .body {
    color: red;
  }
}
@keyframes fade {
  from { opacity: 0; }
  to { opacity: 1; }
}
`,
      filename: "test.css",
      id: "data-v-test",
      scoped: true,
    });

    expect(result.errors).toHaveLength(0);
    const normalized = normalizeCssOutput(flattenCss(result.code));
    const animationValue = normalized
      .match(/\.card\[data-v-test\] \{[^}]*animation:([^;}]+);/)?.[1]
      ?.trim();
    expect(animationValue).toContain("fade-test");
    expect(animationValue).toContain("1s");
    expect(animationValue).toContain("linear");
    expect(normalized).toContain(".card .body[data-v-test] { color: red;");
    expect(normalized).toContain("@keyframes fade-test {");
  });
});
