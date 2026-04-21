import { describe, expect, test } from "vitest";
import { compileStyleWithLightningCss } from "../src/compileStyle";
import { createCompilerRequire } from "../src/nodeRequire";
import { createBrowserCompiler } from "../src/browser";

const loadLightningCss = () => createCompilerRequire("test.css")("lightningcss");

describe("browser compiler", () => {
  test("shares the supported style pipeline with the Node compiler", async () => {
    const browserCompiler = createBrowserCompiler(loadLightningCss);
    const options = {
      source: `
        .card {
          color: v-bind(color);

          :deep(.title) {
            animation: pulse 1s;
          }
        }

        @keyframes pulse {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `,
      filename: "test.css",
      id: "data-v-test",
      scoped: true,
      isProd: true,
    };

    const browserResult = await browserCompiler.compileStyleAsync(options);
    const nodeResult = compileStyleWithLightningCss(options);

    expect(browserResult).toEqual(nodeResult);
  });

  test("rejects preprocessors in the browser compiler", async () => {
    const browserCompiler = createBrowserCompiler(loadLightningCss);

    const result = await browserCompiler.compileStyleAsync({
      source: `.card { color: red; }`,
      filename: "test.scss",
      id: "data-v-test",
      preprocessLang: "scss",
    });

    expect(result.errors).toHaveLength(1);
    expect(String(result.errors[0])).toContain("does not support preprocessors");
  });

  test("rejects css modules in the browser compiler", async () => {
    const browserCompiler = createBrowserCompiler(loadLightningCss);

    const result = await browserCompiler.compileStyleAsync({
      source: `.card { color: red; }`,
      filename: "test.css",
      id: "data-v-test",
      modules: true,
    });

    expect(result.errors).toHaveLength(1);
    expect(String(result.errors[0])).toContain("CSS modules are not supported");
  });
});
