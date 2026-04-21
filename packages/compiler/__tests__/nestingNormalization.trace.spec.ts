import { describe, expect, test } from "vitest";
import {
  formatNestingNormalizationTrace,
  nestingNormalizationTraceCases,
  traceNestingNormalization,
} from "../src/debug/nesting";

describe("nesting normalization trace", () => {
  test.each(nestingNormalizationTraceCases)("$title", ({ source }) => {
    expect(formatNestingNormalizationTrace(traceNestingNormalization(source))).toMatchSnapshot();
  });
});
