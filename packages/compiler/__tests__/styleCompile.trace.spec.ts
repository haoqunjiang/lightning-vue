import { test } from "vitest";
import { compileStyleAsync, compileStyleWithLightningCss } from "../src/compileStyle";
import {
  formatStyleCompileTrace,
  resolveStyleCompileTraceOptions,
  styleCompileTraceCases,
  traceStyleCompile,
} from "../src/debug/styleCompile";

test.each(styleCompileTraceCases)("$title", ({ options }) => {
  return expect(
    traceStyleCompile(options).then(async (trace) => {
      const resolved = resolveStyleCompileTraceOptions(options);
      const publicResult =
        "modules" in resolved && resolved.modules
          ? await compileStyleAsync(resolved)
          : compileStyleWithLightningCss(resolved);

      expect(trace.finalCode).toBe(publicResult.code);
      expect(trace.final.some((line) => line === `errors=${publicResult.errors.length}`)).toBe(
        true,
      );
      expect(
        trace.final.some((line) => line === `dependencies=${publicResult.dependencies.size}`),
      ).toBe(true);

      return formatStyleCompileTrace(trace);
    }),
  ).resolves.toMatchSnapshot();
});
