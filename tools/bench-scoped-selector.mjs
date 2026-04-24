import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const compilerRoot = resolve(repoRoot, "packages/compiler");
const vpBin = resolve(
  repoRoot,
  "node_modules/.bin",
  process.platform === "win32" ? "vp.cmd" : "vp",
);
const defaultBenchFiles = [
  "bench/compileStyle.compare.bench.ts",
  "bench/compileStyle.internal.bench.ts",
  "bench/compileStyle.micro.bench.ts",
  "bench/scopedSelector.bench.ts",
];
const color = {
  cyan: "\x1b[36m",
  dimCyan: "\x1b[2m\x1b[36m",
  green: "\x1b[32m",
  reset: "\x1b[0m",
  yellow: "\x1b[33m",
};

const options = parseArgs(process.argv.slice(2));
const benchFiles = options.benchFiles.length ? options.benchFiles : defaultBenchFiles;
const runCount = options.runs;
const tempDir = mkdtempSync(join(tmpdir(), "lightning-vue-bench-"));

try {
  const reports = [];
  for (let runIndex = 0; runIndex < runCount; runIndex++) {
    reports.push(...runBenchPass(benchFiles, runIndex, runCount));
  }

  const aggregate = aggregateReports(reports, benchFiles, runCount);
  if (options.outputPath) {
    writeJson(options.outputPath, aggregate);
  }

  const baseline = options.comparePath ? readJson(options.comparePath) : null;
  printSummary(aggregate, baseline, options.focusPattern);
} finally {
  rmSync(tempDir, { force: true, recursive: true });
}

function parseArgs(argv) {
  const options = {
    benchFiles: [],
    comparePath: null,
    focusPattern: null,
    outputPath: null,
    runs: 5,
  };

  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index];
    if (argument === "--") {
      continue;
    }
    if (argument === "--bench") {
      options.benchFiles.push(argv[++index]);
      continue;
    }
    if (argument === "--compare") {
      options.comparePath = resolve(repoRoot, argv[++index]);
      continue;
    }
    if (argument === "--focus") {
      options.focusPattern = new RegExp(argv[++index], "i");
      continue;
    }
    if (argument === "--out") {
      options.outputPath = resolve(repoRoot, argv[++index]);
      continue;
    }
    if (argument === "--runs") {
      options.runs = Number(argv[++index]);
      continue;
    }
    throw new Error(`Unknown argument: ${argument}`);
  }

  if (!Number.isInteger(options.runs) || options.runs <= 0) {
    throw new Error(`--runs must be a positive integer, got ${options.runs}`);
  }

  return options;
}

function runBenchPass(benchFiles, runIndex, runCount) {
  console.log(`Running benchmark pass ${runIndex + 1}/${runCount}...`);
  return benchFiles.map((benchFile, benchIndex) =>
    runBenchFile(benchFile, runIndex, runCount, benchIndex, benchFiles.length),
  );
}

function runBenchFile(benchFile, runIndex, runCount, benchIndex, benchFileCount) {
  const outputPath = join(
    tempDir,
    `run-${runIndex + 1}-${benchIndex + 1}-${benchFile.replaceAll(/[\\/]/g, "_")}.json`,
  );
  console.log(`  [${benchIndex + 1}/${benchFileCount}] ${benchFile}`);
  try {
    execFileSync(vpBin, ["test", "bench", benchFile, "--outputJson", outputPath, "--run"], {
      cwd: compilerRoot,
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (error) {
    if (error.stdout) {
      process.stdout.write(error.stdout);
    }
    if (error.stderr) {
      process.stderr.write(error.stderr);
    }
    throw error;
  }
  return JSON.parse(readFileSync(outputPath, "utf8"));
}

function aggregateReports(reports, benchFiles, runCount) {
  const entries = new Map();

  for (const report of reports) {
    for (const file of report.files ?? []) {
      const filePath = relative(compilerRoot, file.filepath);
      for (const group of file.groups ?? []) {
        for (const benchmark of group.benchmarks ?? []) {
          const key = `${filePath}::${group.fullName}::${benchmark.name}`;
          const entry = entries.get(key) ?? {
            file: filePath,
            group: group.fullName,
            name: benchmark.name,
            hzSamples: [],
            meanMsSamples: [],
            medianMsSamples: [],
            rmeSamples: [],
            sampleCountSamples: [],
          };

          entry.hzSamples.push(benchmark.hz);
          entry.meanMsSamples.push(benchmark.mean);
          entry.medianMsSamples.push(benchmark.median);
          entry.rmeSamples.push(benchmark.rme);
          entry.sampleCountSamples.push(benchmark.sampleCount);

          entries.set(key, entry);
        }
      }
    }
  }

  return {
    benchFiles,
    createdAt: new Date().toISOString(),
    runCount,
    benchmarks: Array.from(entries.values())
      .map((entry) => ({
        file: entry.file,
        group: entry.group,
        name: entry.name,
        hz: median(entry.hzSamples),
        meanMs: median(entry.meanMsSamples),
        medianMs: median(entry.medianMsSamples),
        relativeMarginOfError: median(entry.rmeSamples),
        sampleCount: median(entry.sampleCountSamples),
      }))
      .sort((left, right) => {
        const groupCompare = left.group.localeCompare(right.group);
        if (groupCompare !== 0) {
          return groupCompare;
        }
        return left.name.localeCompare(right.name);
      }),
  };
}

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[middle];
  }
  return (sorted[middle - 1] + sorted[middle]) / 2;
}

function printSummary(aggregate, baseline, focusPattern) {
  console.log("");
  console.log(
    `Aggregated ${aggregate.benchmarks.length} benchmarks from ${aggregate.runCount} run(s).`,
  );
  console.log(
    `Bench files: ${aggregate.benchFiles
      .map((file) => relative(compilerRoot, resolve(compilerRoot, file)))
      .join(", ")}`,
  );

  const filtered = focusPattern
    ? aggregate.benchmarks.filter((benchmark) =>
        focusPattern.test(`${benchmark.group} ${benchmark.name}`),
      )
    : aggregate.benchmarks;
  const baselineMap = new Map(
    (baseline?.benchmarks ?? []).map((benchmark) => [
      `${benchmark.file}::${benchmark.group}::${benchmark.name}`,
      benchmark,
    ]),
  );

  if (isHeadroomBenchRun(aggregate.benchFiles)) {
    printLightningCssHeadroomSummary(filtered);
  } else {
    console.log("");
    console.log("Benchmarks by group (median time):");
    printGroupedBenchmarkSummary(filtered, baselineMap);
    printLightningCssHeadroomSummary(filtered);
  }

  if (!baseline) {
    return;
  }

  const changed = [...filtered]
    .map((benchmark) => {
      const key = `${benchmark.file}::${benchmark.group}::${benchmark.name}`;
      const baselineBenchmark = baselineMap.get(key);
      if (!baselineBenchmark) {
        return null;
      }

      return {
        benchmark,
        deltaPercent:
          ((benchmark.medianMs - baselineBenchmark.medianMs) / baselineBenchmark.medianMs) * 100,
      };
    })
    .filter(Boolean)
    .sort((left, right) => Math.abs(right.deltaPercent) - Math.abs(left.deltaPercent))
    .slice(0, Math.min(filtered.length, 15));

  console.log("");
  console.log("Largest median-time deltas vs baseline, grouped:");
  printGroupedDeltaSummary(changed);
}

function splitGroupLabel(benchmark) {
  const normalized = benchmark.group.startsWith(`${benchmark.file} > `)
    ? benchmark.group.slice(benchmark.file.length + 3)
    : benchmark.group;
  const [suite, ...rest] = normalized.split(" > ");
  return {
    suite,
    subgroup: rest.join(" > "),
  };
}

function groupBenchmarksBySuite(benchmarks) {
  const groups = new Map();
  for (const benchmark of benchmarks) {
    const { suite, subgroup } = splitGroupLabel(benchmark);
    const suiteBucket = groups.get(suite) ?? new Map();
    const subgroupKey = subgroup || benchmark.name;
    const subgroupBucket = suiteBucket.get(subgroupKey) ?? [];
    subgroupBucket.push(benchmark);
    suiteBucket.set(subgroupKey, subgroupBucket);
    groups.set(suite, suiteBucket);
  }

  return [...groups.entries()].sort(
    (left, right) =>
      Math.max(...[...right[1].values()].flat().map((benchmark) => benchmark.medianMs)) -
      Math.max(...[...left[1].values()].flat().map((benchmark) => benchmark.medianMs)),
  );
}

function printGroupedBenchmarkSummary(benchmarks, baselineMap) {
  for (const [suite, subgroupMap] of groupBenchmarksBySuite(benchmarks)) {
    console.log(`- ${suite}`);
    const orderedSubgroups = [...subgroupMap.entries()].sort(
      (left, right) =>
        Math.max(...right[1].map((benchmark) => benchmark.medianMs)) -
        Math.max(...left[1].map((benchmark) => benchmark.medianMs)),
    );
    for (const [subgroup, members] of orderedSubgroups) {
      const subgroupLabel = members[0].group.endsWith(` > ${subgroup}`) ? subgroup : null;
      if (subgroupLabel) {
        console.log(`  - ${subgroupLabel}`);
      }
      const comparison = getLightningVsPostcssComparison(members);
      if (comparison) {
        const direction =
          comparison.faster.runtime === "lightningcss"
            ? `lightningcss is ${highlightMetric(formatMultiplier(comparison.multiplier))} faster than postcss`
            : `postcss is ${highlightMetric(formatMultiplier(comparison.multiplier))} faster than lightningcss`;
        console.log(`    ${direction}`);
      }
      for (const benchmark of [...members].sort((left, right) => right.medianMs - left.medianMs)) {
        const key = `${benchmark.file}::${benchmark.group}::${benchmark.name}`;
        const baselineBenchmark = baselineMap.get(key);
        const delta = baselineBenchmark
          ? formatPercentDelta(benchmark.medianMs, baselineBenchmark.medianMs, true)
          : "";
        console.log(
          `    - ${benchmark.name}: ${highlightMetric(formatMilliseconds(benchmark.medianMs))} median, ${highlightMetric(formatHertz(benchmark.hz))}${delta}`,
        );
      }
    }
  }
}

function getLightningVsPostcssComparison(members) {
  if (members.length !== 2) {
    return null;
  }

  const runtimeMembers = members
    .map((benchmark) => ({
      benchmark,
      runtime: getRuntimeLabel(benchmark.name),
    }))
    .filter((entry) => entry.runtime);

  if (runtimeMembers.length !== 2) {
    return null;
  }

  const lightningcss = runtimeMembers.find((entry) => entry.runtime === "lightningcss");
  const postcss = runtimeMembers.find((entry) => entry.runtime === "postcss");
  if (!lightningcss || !postcss) {
    return null;
  }

  const faster = lightningcss.benchmark.hz >= postcss.benchmark.hz ? lightningcss : postcss;
  const slower = faster === lightningcss ? postcss : lightningcss;

  return {
    faster,
    slower,
    multiplier: faster.benchmark.hz / slower.benchmark.hz,
  };
}

function getRuntimeLabel(name) {
  if (name.startsWith("lightningcss ")) {
    return "lightningcss";
  }
  if (name.startsWith("postcss ")) {
    return "postcss";
  }
  return null;
}

function isHeadroomBenchRun(benchFiles) {
  return (
    benchFiles.length === 2 &&
    benchFiles.includes("bench/lightningBaseline.bench.ts") &&
    benchFiles.includes("bench/compileStyle.internal.bench.ts")
  );
}

function printLightningCssHeadroomSummary(benchmarks) {
  const rawEngineByScenario = new Map();
  const preparedTransformByScenario = new Map();
  const noOpSelectorVisitorByScenario = new Map();
  const groups = new Map();

  for (const benchmark of benchmarks) {
    const scenario = getHeadroomScenarioLabel(benchmark);
    if (!scenario) {
      continue;
    }

    const bucket = groups.get(scenario.category) ?? [];
    bucket.push({
      benchmark,
      scenario: scenario.label,
    });
    groups.set(scenario.category, bucket);

    if (scenario.category === "lightningcss baseline: raw transform throughput") {
      rawEngineByScenario.set(scenario.label, benchmark);
    } else if (scenario.category === "lightningcss baseline: Lightning CSS on compiler handoff") {
      preparedTransformByScenario.set(scenario.label, benchmark);
    } else if (scenario.category === "lightningcss baseline: no-op selector visitor throughput") {
      noOpSelectorVisitorByScenario.set(scenario.label, benchmark);
    }
  }

  const headroomGroups = [];
  for (const [category, members] of groups) {
    if (category !== "compileStyle internal: lightningcss end to end") {
      continue;
    }

    const rows = members
      .map(({ benchmark, scenario }) => {
        const rawEngine = rawEngineByScenario.get(scenario);
        const preparedTransform = preparedTransformByScenario.get(scenario);
        const noOpSelectorVisitor = noOpSelectorVisitorByScenario.get(scenario);
        if (
          !rawEngine ||
          !preparedTransform ||
          !noOpSelectorVisitor ||
          typeof rawEngine.hz !== "number" ||
          typeof preparedTransform.hz !== "number" ||
          typeof noOpSelectorVisitor.hz !== "number" ||
          typeof benchmark.hz !== "number"
        ) {
          return null;
        }

        const fullCompilerMs = 1000 / benchmark.hz;
        const handoffTransformMs = 1000 / preparedTransform.hz;
        const compilerJsMs = fullCompilerMs - handoffTransformMs;

        return {
          label: scenario,
          benchmark,
          compilerJsMs,
          compilerJsOverheadShare: compilerJsMs / fullCompilerMs,
          fullCompilerMs,
          handoffTransformMs,
          rawEngine,
          preparedTransform,
          noOpSelectorVisitor,
        };
      })
      .filter(Boolean)
      .sort((left, right) => right.compilerJsOverheadShare - left.compilerJsOverheadShare);

    if (rows.length) {
      headroomGroups.push([category, rows]);
    }
  }

  if (!headroomGroups.length) {
    return;
  }

  console.log("");
  console.log("Compiler headroom:");
  console.log(
    `  ${muted("Main metric")}`,
  );
  console.log(
    `    compiler JS overhead = (full compiler time - handoff transform time) / full compiler time`,
  );
  console.log(
    `    Includes analysis, source rewrites, selector handling, planning, decoding, and finalization.`,
  );
  console.log("");
  console.log(
    `  ${muted("CSS inputs")}`,
  );
  console.log(
    "    authored  Original benchmark CSS.",
  );
  console.log(
    "    handoff   CSS passed to Lightning CSS after v-bind rewrites, nested normalization,",
  );
  console.log(
    "              source scoping, and transform planning.",
  );
  console.log(
    "              Preparation may remove Vue selector carriers or lower nesting before",
  );
  console.log(
    "              Lightning CSS parses the source, so handoff throughput can differ.",
  );
  console.log("");
  console.log(
    `  ${muted("Secondary reference")}`,
  );
  console.log(
    "    forced selector hook = authored CSS transformed with an empty selector callback.",
  );
  console.log(
    "                           Estimates selector-hook cost for visitor-based routes.",
  );
  for (const [category, rows] of headroomGroups) {
    console.log("");
    console.log(`- ${category}`);
    for (const row of rows) {
      const preparedTransformComparison = formatThroughputComparison(
        row.preparedTransform.hz,
        row.rawEngine.hz,
      );
      const noOpSelectorVisitorComparison = formatThroughputComparison(
        row.noOpSelectorVisitor.hz,
        row.rawEngine.hz,
      );
      console.log("");
      console.log(`  ${row.label}`);
      console.log(
        `    ${metric(formatPercent(row.compilerJsOverheadShare), color.yellow)}  compiler JS overhead`,
      );
      console.log(
        `           ${metric(formatMilliseconds(row.compilerJsMs), color.yellow)}  compiler JS work`,
      );
      console.log(
        `           ${metric(formatMilliseconds(row.handoffTransformMs), color.green)}  Lightning CSS handoff`,
      );
      console.log("");
      console.log(`    ${muted("throughput")}`);
      console.log(
        `           ${metric(formatHertz(row.benchmark.hz), color.cyan)}  full compiler`,
      );
      console.log(
        `           ${metric(formatHertz(row.preparedTransform.hz), color.green)}  handoff transform`,
      );
      console.log("");
      console.log(`    ${muted("context")}`);
      console.log(
        `           ${metric(formatHertz(row.rawEngine.hz), color.dimCyan)}  authored CSS`,
      );
      console.log(
        `           ${metric(formatComparedToBaseline(preparedTransformComparison, "authored"), color.dimCyan)}  handoff/authored`,
      );
      console.log(
        `           ${metric(formatHertz(row.noOpSelectorVisitor.hz), color.dimCyan)}  forced selector hook`,
      );
      console.log(
        `           ${metric(formatComparedToBaseline(noOpSelectorVisitorComparison, "authored"), color.dimCyan)}  hook/authored`,
      );
    }
  }
}

function groupDeltaEntriesBySuite(changed) {
  const groups = new Map();
  for (const entry of changed) {
    if (typeof entry?.benchmark?.medianMs !== "number" || typeof entry?.deltaPercent !== "number") {
      continue;
    }
    const { suite, subgroup } = splitGroupLabel(entry.benchmark);
    const suiteBucket = groups.get(suite) ?? new Map();
    const subgroupKey = subgroup || entry.benchmark.name;
    const subgroupBucket = suiteBucket.get(subgroupKey) ?? [];
    subgroupBucket.push(entry);
    suiteBucket.set(subgroupKey, subgroupBucket);
    groups.set(suite, suiteBucket);
  }

  return [...groups.entries()].sort(
    (left, right) =>
      Math.max(...[...right[1].values()].flat().map((entry) => Math.abs(entry.deltaPercent))) -
      Math.max(...[...left[1].values()].flat().map((entry) => Math.abs(entry.deltaPercent))),
  );
}

function printGroupedDeltaSummary(changed) {
  for (const [suite, subgroupMap] of groupDeltaEntriesBySuite(changed)) {
    console.log(`- ${suite}`);
    const orderedSubgroups = [...subgroupMap.entries()].sort(
      (left, right) =>
        Math.max(...right[1].map((entry) => Math.abs(entry.deltaPercent))) -
        Math.max(...left[1].map((entry) => Math.abs(entry.deltaPercent))),
    );
    for (const [subgroup, members] of orderedSubgroups) {
      const subgroupLabel = members[0].benchmark.group.endsWith(` > ${subgroup}`) ? subgroup : null;
      if (subgroupLabel) {
        console.log(`  - ${subgroupLabel}`);
      }
      for (const { benchmark, deltaPercent } of [...members].sort(
        (left, right) => Math.abs(right.deltaPercent) - Math.abs(left.deltaPercent),
      )) {
        if (typeof benchmark.medianMs !== "number" || typeof deltaPercent !== "number") {
          continue;
        }
        console.log(
          `    - ${benchmark.name}: ${formatMilliseconds(benchmark.medianMs)} (${formatSignedPercent(
            deltaPercent,
          )})`,
        );
      }
    }
  }
}

function getHeadroomScenarioLabel(benchmark) {
  const { suite } = splitGroupLabel(benchmark);

  if (suite === "lightningcss baseline: raw transform throughput") {
    return benchmark.name.startsWith("lightningcss ")
      ? {
          category: suite,
          label: benchmark.name.slice("lightningcss ".length),
        }
      : null;
  }

  if (suite === "lightningcss baseline: Lightning CSS on compiler handoff") {
    return benchmark.name.startsWith("lightningcss ")
      ? {
          category: suite,
          label: benchmark.name.slice("lightningcss ".length),
        }
      : null;
  }

  if (suite === "lightningcss baseline: no-op selector visitor throughput") {
    return benchmark.name.startsWith("lightningcss ")
      ? {
          category: suite,
          label: benchmark.name.slice("lightningcss ".length),
        }
      : null;
  }

  if (suite === "compileStyle internal: lightningcss end to end") {
    return benchmark.name.startsWith("lightningcss ")
      ? {
          category: suite,
          label: benchmark.name.slice("lightningcss ".length),
        }
      : null;
  }

  return null;
}

function formatMilliseconds(value) {
  return `${value.toFixed(4)} ms`;
}

function formatHertz(value) {
  return `${value.toFixed(2)} hz`;
}

function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatMultiplier(value) {
  return `${value.toFixed(2)}x`;
}

function formatThroughputComparison(currentHz, baselineHz) {
  if (currentHz === baselineHz) {
    return {
      direction: "same speed",
      multiplier: formatMultiplier(1),
    };
  }

  if (currentHz > baselineHz) {
    return {
      direction: "faster",
      multiplier: formatMultiplier(currentHz / baselineHz),
    };
  }

  return {
    direction: "slower",
    multiplier: formatMultiplier(baselineHz / currentHz),
  };
}

function formatComparedToBaseline(comparison, baselineLabel) {
  if (comparison.direction === "same speed") {
    return `${comparison.multiplier} same speed as ${baselineLabel}`;
  }

  return `${comparison.multiplier} ${comparison.direction} than ${baselineLabel}`;
}

function formatPercentDelta(current, baseline, lowerIsBetter) {
  const delta = ((current - baseline) / baseline) * 100;
  const direction =
    delta === 0
      ? "flat"
      : lowerIsBetter
        ? delta < 0
          ? "faster"
          : "slower"
        : delta < 0
          ? "lower"
          : "higher";
  return ` (${formatSignedPercent(delta)} vs baseline, ${direction})`;
}

function highlightMetric(value) {
  return metric(value, color.cyan);
}

function metric(value, metricColor) {
  return `\x1b[1m${metricColor}${value}${color.reset}`;
}

function muted(value) {
  return `\x1b[2m${value}${color.reset}`;
}

function formatSignedPercent(value) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, value) {
  const outputPath = resolve(repoRoot, path);
  const contents = `${JSON.stringify(value, null, 2)}\n`;
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, contents);
}
