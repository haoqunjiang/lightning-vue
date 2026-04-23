export type { NestingNormalizationTrace, NestingNormalizationTraceCase } from "./debug/nesting";
export {
  formatNestingNormalizationTrace,
  nestingNormalizationTraceCases,
  traceNestingNormalization,
} from "./debug/nesting";

export type { ScopedSelectorTrace, ScopedSelectorTraceCase } from "./debug/scopedSelector";
export {
  formatScopedSelectorTrace,
  scopedSelectorTraceCases,
  traceScopedSelector,
} from "./debug/scopedSelector";

export type { CompileSessionTrace, CompileSessionTraceCase } from "./debug/compileSession";
export {
  compileSessionTraceCases,
  formatCompileSessionTrace,
  traceCompileSession,
} from "./debug/compileSession";

export type { AnimationRewriteTrace, AnimationRewriteTraceCase } from "./debug/animation";
export {
  animationRewriteTraceCases,
  formatAnimationRewriteTrace,
  traceAnimationRewrite,
} from "./debug/animation";
