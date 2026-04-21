import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";

const repoRoot = process.cwd();
const compilerRoot = resolve(repoRoot, "packages/compiler");
const defaultBenchFiles = ["__tests__/scopedSelector.bench.ts", "__tests__/compileStyle.bench.ts"];

const options = parseArgs(process.argv.slice(2));
const benchFiles = options.benchFiles.length ? options.benchFiles : defaultBenchFiles;
const runCount = options.runs;
const tempDir = mkdtempSync(join(tmpdir(), "lightning-vue-bench-"));

try {
  const reports = [];
  for (let runIndex = 0; runIndex < runCount; runIndex++) {
    const outputPath = join(tempDir, `run-${runIndex + 1}.json`);
    execFileSync("vp", ["test", "bench", ...benchFiles, "--outputJson", outputPath, "--run"], {
      cwd: compilerRoot,
      stdio: "inherit",
    });
    reports.push(JSON.parse(readFileSync(outputPath, "utf8")));
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

  const hottest = [...filtered]
    .sort((left, right) => right.medianMs - left.medianMs)
    .slice(0, Math.min(filtered.length, 20));

  console.log("");
  console.log("Top benchmarks by median time:");
  for (const benchmark of hottest) {
    const key = `${benchmark.file}::${benchmark.group}::${benchmark.name}`;
    const baselineBenchmark = baselineMap.get(key);
    const delta = baselineBenchmark
      ? formatPercentDelta(benchmark.medianMs, baselineBenchmark.medianMs, true)
      : "";
    console.log(
      `- ${benchmark.name}: ${formatMilliseconds(benchmark.medianMs)} median, ${formatHertz(benchmark.hz)}${delta}`,
    );
    console.log(`  ${benchmark.group}`);
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
  console.log("Largest median-time deltas vs baseline:");
  for (const { benchmark, deltaPercent } of changed) {
    console.log(
      `- ${benchmark.name}: ${formatMilliseconds(benchmark.medianMs)} (${formatSignedPercent(
        deltaPercent,
      )})`,
    );
    console.log(`  ${benchmark.group}`);
  }
}

function formatMilliseconds(value) {
  return `${value.toFixed(4)} ms`;
}

function formatHertz(value) {
  return `${value.toFixed(2)} hz`;
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
