import { test } from "vitest";
import {
  animationRewriteTraceCases,
  formatAnimationRewriteTrace,
  traceAnimationRewrite,
} from "../src/debug/animation";

test.each(animationRewriteTraceCases)("$title", ({ source, keyframes }) => {
  expect(formatAnimationRewriteTrace(traceAnimationRewrite(source, keyframes))).toMatchSnapshot();
});
