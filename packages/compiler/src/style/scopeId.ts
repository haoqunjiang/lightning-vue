const scopeIdPrefix = "data-v-";

export function getShortScopeId(id: string): string {
  return id.startsWith(scopeIdPrefix) ? id.slice(scopeIdPrefix.length) : id;
}
