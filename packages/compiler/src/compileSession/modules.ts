import type { CSSModuleExports } from "lightningcss";
import { camelize } from "@vue/shared";
import type { CSSModulesOptions } from "./types";

export function createLightningCssModulesConfig(options: CSSModulesOptions) {
  const { generateScopedName } = options;
  return typeof generateScopedName === "string" ? { pattern: generateScopedName } : {};
}

export function normalizeLightningCssModules(
  exports: CSSModuleExports | undefined,
  options: CSSModulesOptions,
): Record<string, string> | undefined {
  if (!exports) {
    return undefined;
  }

  const localsConvention = options.localsConvention;
  const modules: Record<string, string> = {};
  const exportsByCompiledName = new Map(
    Object.values(exports).map((value) => [value.name, value] as const),
  );

  for (const [originalName, value] of Object.entries(exports)) {
    appendCssModuleExport(
      modules,
      originalName,
      collectCssModuleExportNames(value, exportsByCompiledName).join(" "),
      localsConvention,
    );
  }

  return modules;
}

function appendCssModuleExport(
  modules: Record<string, string>,
  originalName: string,
  localName: string,
  localsConvention: CSSModulesOptions["localsConvention"],
): void {
  switch (localsConvention) {
    case "camelCase":
      modules[originalName] = localName;
      modules[camelize(originalName)] = localName;
      return;
    case "camelCaseOnly":
      modules[camelize(originalName)] = localName;
      return;
    case "dashes":
      modules[originalName] = localName;
      if (originalName.includes("-")) {
        modules[camelize(originalName)] = localName;
      }
      return;
    case "dashesOnly":
      if (originalName.includes("-")) {
        modules[camelize(originalName)] = localName;
      } else {
        modules[originalName] = localName;
      }
      return;
    default:
      modules[originalName] = localName;
  }
}

function collectCssModuleExportNames(
  value: CSSModuleExports[string],
  exportsByCompiledName: ReadonlyMap<string, CSSModuleExports[string]>,
  visited = new Set<string>(),
): string[] {
  if (visited.has(value.name)) {
    return [];
  }

  visited.add(value.name);

  const names = [value.name];

  for (const reference of value.composes) {
    if (reference.type === "global") {
      if (!names.includes(reference.name)) {
        names.push(reference.name);
      }
      continue;
    }

    if (reference.type === "dependency") {
      throw new Error(
        "[@lightning-vue/compiler] `modules` with `composes: ... from ...` dependency references is not supported by this package. Use @vue/compiler-sfc when you need the PostCSS-based style pipeline.",
      );
    }

    if (reference.type === "local") {
      const composedExport = exportsByCompiledName.get(reference.name);
      const composedNames = composedExport
        ? collectCssModuleExportNames(composedExport, exportsByCompiledName, visited)
        : [reference.name];

      for (const composedName of composedNames) {
        if (!names.includes(composedName)) {
          names.push(composedName);
        }
      }
    }
  }

  return names;
}
