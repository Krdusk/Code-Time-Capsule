import type { Commit, Issue, CiRun, ImportGraph, FileChange } from "../types";

export type DataCategory = "commits" | "issues" | "ci_runs" | "import_graph";
export type DataKind = "json" | "csv";

export interface ParsedData {
  category: DataCategory;
  items: Commit[] | Issue[] | CiRun[] | ImportGraph[];
  count: number;
  kind: DataKind;
}

export interface ParseError {
  message: string;
  line?: number;
}

/**
 * Try to parse a file blob and return structured data.
 * First attempts JSON parse, then CSV fallback.
 */
export async function parseFile(
  file: File,
  hint?: DataCategory
): Promise<{ data: ParsedData; errors: ParseError[] }> {
  const text = await file.text();
  const fileName = file.name.toLowerCase();

  // Try JSON first
  if (fileName.endsWith(".json")) {
    return parseJson(text, hint);
  }

  // Try CSV
  if (fileName.endsWith(".csv")) {
    return parseCsv(text, hint);
  }

  // Try plain text as JSON
  try {
    return parseJson(text, hint);
  } catch {
    // fall through
  }

  // Try plain text as CSV
  try {
    return parseCsv(text, hint);
  } catch {
    // fall through
  }

  throw new Error(
    `Unrecognised file format for "${file.name}". Upload a .json or .csv file.`
  );
}

/* ── JSON parser ─────────────────────────────────────── */

function parseJson(
  text: string,
  hint?: DataCategory
): { data: ParsedData; errors: ParseError[] } {
  const parsed = JSON.parse(text);
  const arr = Array.isArray(parsed) ? parsed : [parsed];

  if (arr.length === 0) {
    throw new Error("File contains an empty array — no data to import.");
  }

  const category = detectCategory(arr[0], hint);
  const errors: ParseError[] = [];

  // Validate each item
  switch (category) {
    case "commits":
      return {
        data: {
          category,
          items: arr.map((item: Record<string, unknown>, i) => {
            const validated = validateCommit(item, i, errors);
            return validated;
          }) as Commit[],
          count: arr.length,
          kind: "json",
        },
        errors,
      };

    case "issues":
      return {
        data: {
          category,
          items: arr.map((item: Record<string, unknown>, i) => {
            const validated = validateIssue(item, i, errors);
            return validated;
          }) as Issue[],
          count: arr.length,
          kind: "json",
        },
        errors,
      };

    case "ci_runs":
      return {
        data: {
          category,
          items: arr.map((item: Record<string, unknown>, i) => {
            const validated = validateCiRun(item, i, errors);
            return validated;
          }) as CiRun[],
          count: arr.length,
          kind: "json",
        },
        errors,
      };

    case "import_graph":
      return {
        data: {
          category,
          items: arr.map((item: Record<string, unknown>, i) => {
            const validated = validateImportGraph(item, i, errors);
            return validated;
          }) as ImportGraph[],
          count: arr.length,
          kind: "json",
        },
        errors,
      };
  }
}

/* ── CSV parser ───────────────────────────────────────── */

function parseCsv(
  text: string,
  hint?: DataCategory
): { data: ParsedData; errors: ParseError[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    throw new Error("CSV must have a header row and at least one data row.");
  }

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const category = detectCategoryFromHeaders(headers, hint);
  const errors: ParseError[] = [];
  const items: unknown[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? "";
    });

    try {
      switch (category) {
        case "commits":
          items.push(csvToCommit(row, i, errors));
          break;
        case "issues":
          items.push(csvToIssue(row, i, errors));
          break;
        case "ci_runs":
          items.push(csvToCiRun(row, i, errors));
          break;
        case "import_graph":
          items.push(csvToImportGraph(row, i, errors));
          break;
      }
    } catch {
      // skip invalid rows
    }
  }

  return {
    data: {
      category,
      items: items as Commit[] | Issue[] | CiRun[] | ImportGraph[],
      count: items.length,
      kind: "csv",
    },
    errors,
  };
}

/* ── Category detection ───────────────────────────────── */

function detectCategory(
  sample: Record<string, unknown>,
  hint?: DataCategory
): DataCategory {
  if (hint) return hint;

  const keys = Object.keys(sample);
  if (
    keys.includes("hash") &&
    keys.includes("message") &&
    keys.includes("author_name")
  ) {
    return "commits";
  }
  if (
    keys.includes("github_id") &&
    keys.includes("title") &&
    keys.includes("body")
  ) {
    return "issues";
  }
  if (
    keys.includes("run_id") &&
    keys.includes("workflow_name") &&
    keys.includes("conclusion")
  ) {
    return "ci_runs";
  }
  if (
    keys.includes("source_file") &&
    keys.includes("target_file") &&
    keys.includes("import_type")
  ) {
    return "import_graph";
  }

  throw new Error(
    "Could not detect data type from JSON keys. " +
      "Expected keys for commits (hash, message, author_name), " +
      "issues (github_id, title, body), " +
      "CI runs (run_id, workflow_name, conclusion), " +
      "or import graph (source_file, target_file, import_type). " +
      "You can also specify the type explicitly."
  );
}

function detectCategoryFromHeaders(
  headers: string[],
  hint?: DataCategory
): DataCategory {
  if (hint) return hint;

  if (
    headers.includes("hash") &&
    headers.includes("message") &&
    headers.includes("author_name")
  ) {
    return "commits";
  }
  if (
    headers.includes("github_id") &&
    headers.includes("title") &&
    headers.includes("body")
  ) {
    return "issues";
  }
  if (
    headers.includes("run_id") &&
    headers.includes("workflow_name") &&
    headers.includes("conclusion")
  ) {
    return "ci_runs";
  }
  if (
    headers.includes("source_file") &&
    headers.includes("target_file") &&
    headers.includes("import_type")
  ) {
    return "import_graph";
  }

  throw new Error(
    "Could not detect data type from CSV headers. " +
      "Expected columns for commits (hash, message, author_name), " +
      "issues (github_id, title, body), " +
      "CI runs (run_id, workflow_name, conclusion), " +
      "or import graph (source_file, target_file, import_type)."
  );
}

/* ── Validators / mappers ─────────────────────────────── */

function validateCommit(
  item: Record<string, unknown>,
  index: number,
  errors: ParseError[]
): Commit {
  if (!item.hash || !item.message || !item.author_name) {
    errors.push({
      message: `Row ${index + 1}: missing required fields (hash, message, author_name)`,
      line: index + 1,
    });
  }

  return {
    hash: String(item.hash ?? ""),
    author_name: String(item.author_name ?? ""),
    author_email: String(item.author_email ?? ""),
    message: String(item.message ?? ""),
    files_changed: Array.isArray(item.files_changed)
      ? item.files_changed.map((f: unknown) => ({
          path: String((f as Record<string, unknown>).path ?? ""),
          additions: Number((f as Record<string, unknown>).additions ?? 0),
          deletions: Number((f as Record<string, unknown>).deletions ?? 0),
        }))
      : [],
    committed_at: String(item.committed_at ?? new Date().toISOString()),
  };
}

function validateIssue(
  item: Record<string, unknown>,
  index: number,
  errors: ParseError[]
): Issue {
  if (!item.github_id || !item.title) {
    errors.push({
      message: `Row ${index + 1}: missing required fields (github_id, title)`,
      line: index + 1,
    });
  }

  return {
    github_id: Number(item.github_id ?? 0),
    type: item.type === "pull_request" ? "pull_request" : "issue",
    title: String(item.title ?? ""),
    body: String(item.body ?? ""),
    state: String(item.state ?? "open"),
    labels: Array.isArray(item.labels) ? item.labels.map(String) : [],
    created_at: String(item.created_at ?? new Date().toISOString()),
    closed_at: item.closed_at ? String(item.closed_at) : null,
  };
}

function validateCiRun(
  item: Record<string, unknown>,
  index: number,
  errors: ParseError[]
): CiRun {
  if (!item.run_id || !item.workflow_name) {
    errors.push({
      message: `Row ${index + 1}: missing required fields (run_id, workflow_name)`,
      line: index + 1,
    });
  }

  return {
    run_id: Number(item.run_id ?? 0),
    workflow_name: String(item.workflow_name ?? ""),
    status: String(item.status ?? "unknown"),
    conclusion: item.conclusion ? String(item.conclusion) : null,
    branch: String(item.branch ?? "main"),
    created_at: String(item.created_at ?? new Date().toISOString()),
    logs: String(item.logs ?? ""),
  };
}

function validateImportGraph(
  item: Record<string, unknown>,
  index: number,
  errors: ParseError[]
): ImportGraph {
  if (!item.source_file || !item.target_file) {
    errors.push({
      message: `Row ${index + 1}: missing required fields (source_file, target_file)`,
      line: index + 1,
    });
  }

  const importType = String(item.import_type ?? "relative");
  return {
    source_file: String(item.source_file ?? ""),
    target_file: String(item.target_file ?? ""),
    import_type: (["relative", "bare", "absolute"].includes(importType)
      ? importType
      : "relative") as ImportGraph["import_type"],
  };
}

/* ── CSV row mappers ──────────────────────────────────── */

function csvToCommit(
  row: Record<string, string>,
  _line: number,
  _errors: ParseError[]
): Commit {
  // For CSV, files_changed is a JSON-encoded string column
  let filesChanged: FileChange[] = [];
  try {
    if (row["files_changed"]) {
      filesChanged = JSON.parse(row["files_changed"]);
    }
  } catch {
    filesChanged = [];
  }

  return {
    hash: row["hash"] ?? "",
    author_name: row["author_name"] ?? "",
    author_email: row["author_email"] ?? "",
    message: row["message"] ?? "",
    files_changed: filesChanged,
    committed_at: row["committed_at"] ?? new Date().toISOString(),
  };
}

function csvToIssue(
  row: Record<string, string>,
  _line: number,
  _errors: ParseError[]
): Issue {
  let labels: string[] = [];
  try {
    if (row["labels"]) labels = JSON.parse(row["labels"]);
  } catch {
    labels = row["labels"] ? row["labels"].split(";") : [];
  }

  return {
    github_id: Number(row["github_id"] ?? 0),
    type: row["type"] === "pull_request" ? "pull_request" : "issue",
    title: row["title"] ?? "",
    body: row["body"] ?? "",
    state: row["state"] ?? "open",
    labels,
    created_at: row["created_at"] ?? new Date().toISOString(),
    closed_at: row["closed_at"] ?? null,
  };
}

function csvToCiRun(
  row: Record<string, string>,
  _line: number,
  _errors: ParseError[]
): CiRun {
  return {
    run_id: Number(row["run_id"] ?? 0),
    workflow_name: row["workflow_name"] ?? "",
    status: row["status"] ?? "unknown",
    conclusion: row["conclusion"] ?? null,
    branch: row["branch"] ?? "main",
    created_at: row["created_at"] ?? new Date().toISOString(),
    logs: row["logs"] ?? "",
  };
}

function csvToImportGraph(
  row: Record<string, string>,
  _line: number,
  _errors: ParseError[]
): ImportGraph {
  const importType = row["import_type"] ?? "relative";
  return {
    source_file: row["source_file"] ?? "",
    target_file: row["target_file"] ?? "",
    import_type: (["relative", "bare", "absolute"].includes(importType)
      ? importType
      : "relative") as ImportGraph["import_type"],
  };
}