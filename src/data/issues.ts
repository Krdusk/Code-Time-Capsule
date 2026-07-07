import type { Issue } from "../types";

export const dayjsIssues: Issue[] = [
  {
    github_id: 1001,
    type: "issue",
    title: "Consider renaming project — name collision with existing dayjs npm package",
    body:
      "There's already a 'dayjs' on npm. We might want to consider a different name before publishing.",
    state: "closed",
    labels: ["discussion", "meta"],
    created_at: "2019-08-12T08:00:00Z",
    closed_at: "2019-08-14T12:30:00Z",
  },
  {
    github_id: 1056,
    type: "issue",
    title: "Feature request: support for custom locale loading",
    body:
      "Currently there's no way to load only the locales you need. Would be nice to have locale registration API.",
    state: "closed",
    labels: ["enhancement", "locale"],
    created_at: "2019-10-05T16:20:00Z",
    closed_at: "2019-11-01T10:00:00Z",
  },
  {
    github_id: 1103,
    type: "pull_request",
    title: "feat: implement locale registration API with tree-shaking support",
    body:
      "Adds Dayjs.locale() and Dayjs.updateLocale() methods. Locales can be imported individually for tree-shaking.\n\nCloses #1056.",
    state: "merged",
    labels: ["enhancement", "locale"],
    created_at: "2019-10-28T14:00:00Z",
    closed_at: "2019-11-01T10:00:00Z",
  },
  {
    github_id: 1156,
    type: "issue",
    title: "dayjs().format('YY') returns wrong year for dates near year boundary",
    body:
      "When formatting a date near the year boundary, YY returns the previous year. Reproduced in v1.10.0 on Windows.",
    state: "closed",
    labels: ["bug", "formatting"],
    created_at: "2020-01-05T14:32:00Z",
    closed_at: "2020-01-12T09:15:00Z",
  },
  {
    github_id: 1201,
    type: "issue",
    title: "dayjs().format('YY') returns wrong year for dates near year boundary",
    body:
      "When formatting a date near the year boundary, YY returns the previous year. Reproduced in v1.10.0 on Windows.",
    state: "closed",
    labels: ["bug", "formatting"],
    created_at: "2021-12-28T14:32:00Z",
    closed_at: "2022-01-05T09:15:00Z",
  },
  {
    github_id: 1255,
    type: "issue",
    title: "Feature request: support for custom parsing formats like moment(String, String)",
    body:
      "moment('03-15-2022', 'MM-DD-YYYY') is very useful. Would be great to have equivalent in dayjs.",
    state: "closed",
    labels: ["enhancement", "parsing"],
    created_at: "2022-01-20T09:00:00Z",
    closed_at: "2022-02-10T14:00:00Z",
  },
  {
    github_id: 1289,
    type: "pull_request",
    title: "feat: add customParseFormat plugin",
    body:
      "Implements format-string parsing similar to moment(String, String). Supports all dayjs format tokens.\n\nCloses #1255.",
    state: "merged",
    labels: ["enhancement", "parsing"],
    created_at: "2022-02-05T10:30:00Z",
    closed_at: "2022-02-10T14:00:00Z",
  },
  {
    github_id: 1350,
    type: "issue",
    title: "Support for custom parsing formats like moment(String, String)",
    body:
      "Would be great to have dayjs('2022-03-15', 'YYYY-MM-DD') similar to moment's parsing with format string.",
    state: "open",
    labels: ["enhancement", "parsing"],
    created_at: "2022-03-15T10:00:00Z",
    closed_at: null,
  },
  {
    github_id: 1402,
    type: "issue",
    title: "Memory leak when creating many dayjs instances in a loop",
    body:
      "Creating thousands of dayjs() instances inside a loop causes memory to grow unbounded. Internal cached objects are never released.",
    state: "closed",
    labels: ["bug", "performance"],
    created_at: "2022-05-10T12:00:00Z",
    closed_at: "2022-05-28T16:30:00Z",
  },
  {
    github_id: 1445,
    type: "pull_request",
    title: "perf: reduce object allocation in dayjs constructor",
    body:
      "Reuses internal config objects and avoids unnecessary allocations. Reduces GC pressure by ~40% in tight loops.\n\nFixes #1402.",
    state: "merged",
    labels: ["performance"],
    created_at: "2022-05-22T08:15:00Z",
    closed_at: "2022-05-28T16:30:00Z",
  },
  {
    github_id: 1489,
    type: "pull_request",
    title:
      "feat: add isSameOrAfter and isSameOrBefore query methods",
    body:
      "Adds two new query methods that mirror the existing isSame and isBefore/isAfter but with inclusive boundaries.\n\nCloses #1478.",
    state: "merged",
    labels: ["enhancement", "query"],
    created_at: "2022-07-22T16:45:00Z",
    closed_at: "2022-08-01T11:30:00Z",
  },
  {
    github_id: 1550,
    type: "issue",
    title: "Deprecation warning when using dayjs().format() with Node 18",
    body:
      "Node 18 throws a deprecation warning about using regex /re/ with the global flag. Seems to be in the format function internals.",
    state: "closed",
    labels: ["bug", "node"],
    created_at: "2022-10-15T09:45:00Z",
    closed_at: "2022-10-22T11:00:00Z",
  },
  {
    github_id: 1602,
    type: "issue",
    title:
      "UTC plugin: .utc().format() produces incorrect offset for timezones with fractional offsets",
    body:
      "When using the UTC plugin with timezones like Asia/Kathmandu (+05:45), the offset is calculated incorrectly.",
    state: "open",
    labels: ["bug", "UTC", "plugin"],
    created_at: "2023-01-10T07:20:00Z",
    closed_at: null,
  },
  {
    github_id: 1655,
    type: "issue",
    title: "Request: ESM-only distribution to reduce dual-package hazard",
    body:
      "Would be great to ship an ESM-only version so bundlers can tree-shake more aggressively. CommonJS fallback adds complexity.",
    state: "open",
    labels: ["enhancement", "build"],
    created_at: "2023-03-22T16:00:00Z",
    closed_at: null,
  },
  {
    github_id: 1701,
    type: "pull_request",
    title: "build: add ESM-only entry point with exports map",
    body:
      "Adds 'import' and 'require' export conditions in package.json so bundlers can pick ESM directly.\n\nRefs #1655.",
    state: "open",
    labels: ["enhancement", "build"],
    created_at: "2023-04-10T11:00:00Z",
    closed_at: null,
  },
  {
    github_id: 1723,
    type: "pull_request",
    title: "docs: improve Chinese locale documentation and add examples",
    body:
      "Updates the Chinese (zh-cn) locale docs with clearer examples and fixes translation inconsistencies.",
    state: "merged",
    labels: ["docs", "locale"],
    created_at: "2023-05-18T04:30:00Z",
    closed_at: "2023-05-25T12:00:00Z",
  },
  {
    github_id: 1805,
    type: "issue",
    title: "Suggestion: add Duration plugin for time arithmetic",
    body:
      "Would love to see dayjs.duration() like moment.duration() for adding durations to dates in a readable way.",
    state: "open",
    labels: ["enhancement", "plugin"],
    created_at: "2023-09-05T10:30:00Z",
    closed_at: null,
  },
  {
    github_id: 1860,
    type: "issue",
    title: "Incorrect date when crossing DST boundaries with add()",
    body:
      "Calling .add(1, 'day') on a date that crosses a DST boundary sometimes returns the same hour instead of the same time on the next day.",
    state: "open",
    labels: ["bug", "DST"],
    created_at: "2023-12-10T08:15:00Z",
    closed_at: null,
  },
  {
    github_id: 1912,
    type: "pull_request",
    title: "fix: preserve time-of-day when adding days across DST transitions",
    body:
      "Fixes DST boundary issue by using UTC epoch arithmetic for day-level additions instead of local date math.\n\nFixes #1860.",
    state: "merged",
    labels: ["bug", "DST"],
    created_at: "2024-01-15T14:00:00Z",
    closed_at: "2024-01-28T10:00:00Z",
  },
  {
    github_id: 1950,
    type: "issue",
    title: "Consider dropping Node 12 and 14 support for v2",
    body:
      "Node 12 and 14 are EOL. Updating minimum Node version would let us use newer language features and simplify CI.",
    state: "open",
    labels: ["discussion", "meta", "v2"],
    created_at: "2024-03-01T09:00:00Z",
    closed_at: null,
  },
];