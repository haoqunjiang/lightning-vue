import { parseCssBlockTree } from "@lightning-vue/utils";
import {
  createNestedBlockNormalizationInstructions,
  createInitialNestedNormalizationContext,
  type NestedNormalizationContext,
  type NestedBlockNormalizationInstructions,
} from "../style/lightningcss/nesting/instructions";
import { normalizeNestedStyleBlocks } from "../style/lightningcss/nesting/normalize";

export interface NestingNormalizationTraceCase {
  source: string;
  title: string;
}

export interface TracedNestedBlockInstructions {
  block: string;
  instructions: string[];
  children: TracedNestedBlockInstructions[];
}

export interface NestingNormalizationTrace {
  introducedScopedSelectorSpecials: boolean;
  normalized: boolean;
  normalizedCode: string;
  source: string;
  instructions: TracedNestedBlockInstructions[];
}

export const nestingNormalizationTraceCases: NestingNormalizationTraceCase[] = [
  {
    title: "local declarations wrapped before nested style rules",
    source: `.card {
  color: red;
  .title { color: blue; }
}`,
  },
  {
    title: "outer deep context keeps the parent rule context-only",
    source: `:deep(.shell) {
  color: red;
  .title { color: blue; }
}`,
  },
  {
    title: "conditional wrappers propagate declaration wrappers",
    source: `.card {
  color: red;
  @media (min-width: 600px) {
    color: blue;
    .title { color: green; }
  }
}`,
  },
  {
    title: "mixed local and deep branches warn conservatively",
    source: `.layout :is(:deep(.shell), .pane) {
  color: red;
  .title { color: blue; }
}`,
  },
];

export function traceNestingNormalization(source: string): NestingNormalizationTrace {
  const result = normalizeNestedStyleBlocks(source, "trace.css");
  return {
    normalized: result.normalized,
    introducedScopedSelectorSpecials: result.introducedScopedSelectorSpecials,
    normalizedCode: result.code,
    source,
    instructions: parseCssBlockTree(source).map((block) =>
      traceNestedBlockInstructions(block, createInitialNestedNormalizationContext()),
    ),
  };
}

export function formatNestingNormalizationTrace(trace: NestingNormalizationTrace): string {
  return [
    `source: ${trace.source}`,
    "",
    "instructions:",
    ...trace.instructions.flatMap((instructions) =>
      formatTracedNestedBlockInstructions(instructions, 1),
    ),
    "",
    "result:",
    ...formatNormalizationResult(trace).map((line) => `  - ${line}`),
  ].join("\n");
}

function traceNestedBlockInstructions(
  block: ReturnType<typeof parseCssBlockTree>[number],
  context: NestedNormalizationContext,
): TracedNestedBlockInstructions {
  const instructions = createNestedBlockNormalizationInstructions(block, context);
  const children = instructions
    ? block.children.map((child) =>
        traceNestedBlockInstructions(
          child,
          child.blockKind === "style"
            ? instructions.childStyleContext
            : instructions.childAtRuleContext,
        ),
      )
    : [];

  return {
    block: formatBlockLabel(block.blockKind, block.normalizedPrelude),
    instructions: formatNestedBlockInstructions(context, instructions),
    children,
  };
}

function formatBlockLabel(blockKind: string, prelude: string): string {
  return `${blockKind} ${JSON.stringify(prelude)}`;
}

function formatNestedBlockInstructions(
  context: NestedNormalizationContext,
  instructions: NestedBlockNormalizationInstructions | null,
): string[] {
  const contextLines = [
    `context.inherited=${context.inheritedContext}`,
    `context.wrapper=${context.propagatedDeclarationWrapper ?? "none"}`,
  ];

  if (!instructions) {
    return [...contextLines, "instructions=none"];
  }

  return [
    ...contextLines,
    `instructions.kind=${instructions.blockKind}`,
    `instructions.wrapper=${instructions.declarationWrapperPrelude ?? "none"}`,
    `instructions.disableCurrentRuleInjection=${instructions.disableCurrentRuleInjection}`,
    `instructions.hoistDeclarationOnlyAtRules=${!!instructions.hoistDeclarationOnlyAtRulesToParentEnd}`,
    `instructions.childStyleContext=${formatNestedContext(instructions.childStyleContext)}`,
    `instructions.childAtRuleContext=${formatNestedContext(instructions.childAtRuleContext)}`,
    "warningMessage" in instructions
      ? `instructions.warning=${instructions.warningMessage ?? "none"}`
      : "instructions.warning=none",
  ];
}

function formatNestedContext(context: NestedNormalizationContext): string {
  return `${context.inheritedContext}|${context.propagatedDeclarationWrapper ?? "none"}`;
}

function formatTracedNestedBlockInstructions(
  trace: TracedNestedBlockInstructions,
  depth: number,
): string[] {
  const indent = "  ".repeat(depth);
  return [
    `${indent}- ${trace.block}`,
    ...trace.instructions.map((line) => `${indent}  ${line}`),
    ...trace.children.flatMap((child) => formatTracedNestedBlockInstructions(child, depth + 1)),
  ];
}

function formatNormalizationResult(trace: NestingNormalizationTrace): string[] {
  return [
    `normalized=${trace.normalized}`,
    `introducedScopedSelectorSpecials=${trace.introducedScopedSelectorSpecials}`,
    `code=${JSON.stringify(trace.normalizedCode)}`,
  ];
}
