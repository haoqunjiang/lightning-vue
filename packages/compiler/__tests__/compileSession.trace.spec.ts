import { test } from "vitest";
import { compileStyleAsync, compileStyleWithLightningCss } from "../src/compileStyle";
import {
  compileSessionTraceCases,
  formatCompileSessionTrace,
  resolveCompileSessionTraceOptions,
  traceCompileSession,
} from "../src/debug/compileSession";

test.each(compileSessionTraceCases)("$title", ({ options }) => {
  return expect(
    traceCompileSession(options).then(async (trace) => {
      const resolved = resolveCompileSessionTraceOptions(options);
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

      return formatCompileSessionTrace(trace);
    }),
  ).resolves.toMatchSnapshot();
});
