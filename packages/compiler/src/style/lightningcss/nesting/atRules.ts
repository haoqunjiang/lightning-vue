const declarationWrapperAtRuleRE =
  /^@(?:media|supports|container|layer|scope|document|starting-style)\b/i;

export function getPropagatedDeclarationWrapper(
  prelude: string,
  declarationWrapper: string | null,
): string | null {
  return declarationWrapper && atRuleCanPropagateDeclarationWrapper(prelude)
    ? declarationWrapper
    : null;
}

function atRuleCanPropagateDeclarationWrapper(prelude: string): boolean {
  return declarationWrapperAtRuleRE.test(prelude);
}
