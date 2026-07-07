/**
 * Seed Script — Codebase Archaeologist
 *
 * This is a one-off Node.js script for pre-processing a real open-source
 * repository (like day.js) and generating the JSON data files used by
 * the client-side query engine.
 *
 * To run:
 *   1. Install dependencies: npm install
 *   2. Run: npx tsx scripts/seed-dayjs.ts
 *
 * The script does NOT need Supabase — it writes JSON files directly
 * to src/data/ for the client-side data layer.
 */

import fs from "fs";
import path from "path";

/* ── CONSTANTS ──────────────────────────────────────────────── */

const DATA_DIR = path.resolve("src/data");
const REPO_URL = "https://github.com/iamkun/dayjs.git";
const CLONE_DIR = path.resolve(".tmp/dayjs");

/* ── SIMULATED DATA (in a real run, this would parse the actual repo) ── */

const REPO_META = {
  id: "day-js",
  name: "day.js",
  owner: "hghluwigihghluwigi",
  description: "Fast 2kB alternative to Moment.js with the same modern API",
  language: "javascript",
  processed_at: new Date().toISOString(),
  stats: {
    commits_count: 2156,
    issues_count: 89,
    prs_count: 143,
    ci_runs_count: 67,
  },
};

const SAMPLE_COMMITS = [
  {
    hash: "a1b2c3d4e5f6",
    author_name: "iamkun",
    author_email: "iamkun@example.com",
    message: "feat: initial implementation of dayjs core with chainable API",
    files_changed: [
      { path: "src/index.js", additions: 320, deletions: 0 },
      { path: "src/constants.js", additions: 45, deletions: 0 },
      { path: "src/utils.js", additions: 78, deletions: 0 },
    ],
    committed_at: "2020-01-15T10:30:00Z",
  },
  {
    hash: "b2c3d4e5f6a7",
    author_name: "acme",
    author_email: "acme@example.com",
    message: "fix: correct week of year calculation for ISO weeks",
    files_changed: [
      { path: "src/index.js", additions: 12, deletions: 4 },
      { path: "src/plugin/weekOfYear.js", additions: 34, deletions: 8 },
    ],
    committed_at: "2020-03-22T14:15:00Z",
  },
];

const SAMPLE_ISSUES = [
  {
    github_id: 1201,
    type: "issue",
    title: "dayjs().format('YY') returns wrong year for dates near year boundary",
    body: "When formatting a date near the year boundary...",
    state: "closed",
    labels: ["bug", "formatting"],
    created_at: "2021-12-28T14:32:00Z",
    closed_at: "2022-01-05T09:15:00Z",
  },
];

const SAMPLE_CI_RUNS = [
  {
    run_id: 4501,
    workflow_name: "CI / test (ubuntu-latest, node 14)",
    status: "completed",
    conclusion: "success",
    branch: "main",
    created_at: "2023-06-01T08:00:00Z",
    logs: "PASS: all 1562 unit tests passed in 34.2s",
  },
];

const SAMPLE_IMPORT_GRAPH = [
  { source_file: "src/index.js", target_file: "src/constants.js", import_type: "relative" },
  { source_file: "src/index.js", target_file: "src/utils.js", import_type: "relative" },
];

/* ── WRITE JSON FILES ──────────────────────────────────────── */

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function writeJson(filename: string, data: unknown) {
  const filepath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), "utf-8");
  console.log(`  ✓ Wrote ${filepath}`);
}

function main() {
  console.log("\n  🦴  Codebase Archaeologist — Seed Generator\n");
  ensureDir(DATA_DIR);

  // Write repository metadata
  writeJson("repositories.ts", `import type { Repository } from "../types";\n\nexport const sampleRepositories: Repository[] = ${JSON.stringify([REPO_META], null, 2)};`);

  // Write commits
  writeJson("commits.ts", `import type { Commit } from "../types";\n\nexport const dayjsCommits: Commit[] = ${JSON.stringify(SAMPLE_COMMITS, null, 2)};`);

  // Write issues
  writeJson("issues.ts", `import type { Issue } from "../types";\n\nexport const dayjsIssues: Issue[] = ${JSON.stringify(SAMPLE_ISSUES, null, 2)};`);

  // Write CI runs
  writeJson("ci-runs.ts", `import type { CiRun } from "../types";\n\nexport const dayjsCiRuns: CiRun[] = ${JSON.stringify(SAMPLE_CI_RUNS, null, 2)};`);

  // Write import graph
  writeJson("import-graph.ts", `import type { ImportGraph } from "../types";\n\nexport const dayjsImportGraph: ImportGraph[] = ${JSON.stringify(SAMPLE_IMPORT_GRAPH, null, 2)};`);

  console.log("\n  ✅ Done! Data files written to src/data/\n");
}

main();