import type { Commit } from "../types";

export const dayjsCommits: Commit[] = [
  {
    hash: "1a2b3c4d5e6f",
    author_name: "hghluwigihghluwigi",
    author_email: "hghluwigihghluwigi@example.com",
    message: "chore: initialize project structure and tooling",
    files_changed: [
      { path: "package.json", additions: 48, deletions: 0 },
      { path: "rollup.config.js", additions: 32, deletions: 0 },
      { path: ".eslintrc.js", additions: 18, deletions: 0 },
      { path: "jest.config.js", additions: 14, deletions: 0 },
    ],
    committed_at: "2019-08-10T09:00:00Z",
  },
  {
    hash: "2b3c4d5e6f7a",
    author_name: "hghluwigihghluwigi",
    author_email: "hghluwigihghluwigi@example.com",
    message: "feat: core dayjs prototype with chainable API",
    files_changed: [
      { path: "src/index.js", additions: 280, deletions: 0 },
      { path: "src/constants.js", additions: 42, deletions: 0 },
      { path: "src/utils.js", additions: 78, deletions: 0 },
    ],
    committed_at: "2019-08-15T14:20:00Z",
  },
  {
    hash: "3c4d5e6f7a8b",
    author_name: "contributor01",
    author_email: "c01@example.com",
    message: "test: add unit tests for dayjs core API",
    files_changed: [
      { path: "test/unit/core.test.js", additions: 412, deletions: 0 },
      { path: "test/unit/parse.test.js", additions: 186, deletions: 0 },
    ],
    committed_at: "2019-09-02T11:10:00Z",
  },
  {
    hash: "4d5e6f7a8b9c",
    author_name: "hghluwigihghluwigi",
    author_email: "hghluwigihghluwigi@example.com",
    message: "feat: add isBefore, isAfter, isSame query methods",
    files_changed: [
      { path: "src/index.js", additions: 45, deletions: 0 },
      { path: "types/index.d.ts", additions: 12, deletions: 0 },
    ],
    committed_at: "2019-10-20T16:30:00Z",
  },
  {
    hash: "5e6f7a8b9c0d",
    author_name: "acme",
    author_email: "acme@example.com",
    message: "fix: handle null and undefined inputs in dayjs constructor",
    files_changed: [
      { path: "src/index.js", additions: 8, deletions: 3 },
      { path: "test/unit/parse.test.js", additions: 24, deletions: 0 },
    ],
    committed_at: "2019-12-05T10:45:00Z",
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
  {
    hash: "c3d4e5f6a7b8",
    author_name: "hghluwigihghluwigi",
    author_email: "hghluwigihghluwigi@example.com",
    message: "feat: add advancedFormat plugin for custom date formatting",
    files_changed: [
      { path: "src/plugin/advancedFormat.js", additions: 156, deletions: 0 },
      { path: "src/index.js", additions: 5, deletions: 1 },
      { path: "types/index.d.ts", additions: 24, deletions: 0 },
    ],
    committed_at: "2020-05-10T09:00:00Z",
  },
  {
    hash: "6f7a8b9c0d1e",
    author_name: "contributor02",
    author_email: "c02@example.com",
    message: "feat: add isLeapYear and daysInMonth helper methods",
    files_changed: [
      { path: "src/index.js", additions: 28, deletions: 0 },
      { path: "test/unit/core.test.js", additions: 34, deletions: 0 },
      { path: "types/index.d.ts", additions: 6, deletions: 0 },
    ],
    committed_at: "2020-08-14T15:20:00Z",
  },
  {
    hash: "7a8b9c0d1e2f",
    author_name: "hghluwigihghluwigi",
    author_email: "hghluwigihghluwigi@example.com",
    message: "docs: add JSDoc annotations to all public methods",
    files_changed: [
      { path: "src/index.js", additions: 62, deletions: 8 },
      { path: "src/constants.js", additions: 4, deletions: 0 },
    ],
    committed_at: "2020-11-30T12:00:00Z",
  },
  {
    hash: "d4e5f6a7b8c9",
    author_name: "dependabot[bot]",
    author_email: "dependabot@example.com",
    message: "chore: bump lodash from 4.17.20 to 4.17.21",
    files_changed: [
      { path: "package.json", additions: 1, deletions: 1 },
    ],
    committed_at: "2021-02-05T18:45:00Z",
  },
  {
    hash: "8b9c0d1e2f3a",
    author_name: "contributor03",
    author_email: "c03@example.com",
    message: "feat: add customParseFormat plugin for moment-like parsing",
    files_changed: [
      { path: "src/plugin/customParseFormat.js", additions: 178, deletions: 0 },
      { path: "src/index.js", additions: 4, deletions: 0 },
      { path: "types/index.d.ts", additions: 8, deletions: 0 },
    ],
    committed_at: "2021-04-10T09:30:00Z",
  },
  {
    hash: "e5f6a7b8c9d0",
    author_name: "acme",
    author_email: "acme@example.com",
    message:
      "fix: handle invalid date strings gracefully instead of throwing",
    files_changed: [
      { path: "src/index.js", additions: 18, deletions: 5 },
      { path: "test/unit/parse.test.js", additions: 32, deletions: 0 },
    ],
    committed_at: "2021-06-12T11:20:00Z",
  },
  {
    hash: "9c0d1e2f3a4b",
    author_name: "contributor01",
    author_email: "c01@example.com",
    message: "test: add integration tests for locale switching",
    files_changed: [
      { path: "test/integration/locale.test.js", additions: 215, deletions: 0 },
      { path: "src/locale.js", additions: 0, deletions: 0 },
    ],
    committed_at: "2021-09-25T14:00:00Z",
  },
  {
    hash: "f6a7b8c9d0e1",
    author_name: "hghluwigihghluwigi",
    author_email: "hghluwigihghluwigi@example.com",
    message:
      "perf: optimize parse logic to reduce bundle size by 200 bytes",
    files_changed: [
      { path: "src/index.js", additions: 8, deletions: 25 },
      { path: "src/utils.js", additions: 3, deletions: 12 },
    ],
    committed_at: "2022-01-20T16:00:00Z",
  },
  {
    hash: "0d1e2f3a4b5c",
    author_name: "contributor04",
    author_email: "c04@example.com",
    message: "feat: add timezone plugin with IANA timezone support",
    files_changed: [
      { path: "src/plugin/timezone.js", additions: 324, deletions: 0 },
      { path: "src/plugin/timezone.d.ts", additions: 42, deletions: 0 },
      { path: "src/index.js", additions: 6, deletions: 0 },
    ],
    committed_at: "2022-04-18T10:15:00Z",
  },
  {
    hash: "a7b8c9d0e1f2",
    author_name: "contributor01",
    author_email: "c01@example.com",
    message: "feat: add relativeTime plugin with i18n support",
    files_changed: [
      { path: "src/plugin/relativeTime.js", additions: 198, deletions: 0 },
      { path: "src/plugin/relativeTime.d.ts", additions: 34, deletions: 0 },
      { path: "src/index.js", additions: 3, deletions: 0 },
    ],
    committed_at: "2022-08-03T08:45:00Z",
  },
  {
    hash: "1e2f3a4b5c6d",
    author_name: "hghluwigihghluwigi",
    author_email: "hghluwigihghluwigi@example.com",
    message: "fix: correct timezone offset for fractional timezone regions",
    files_changed: [
      { path: "src/plugin/timezone.js", additions: 18, deletions: 6 },
      { path: "test/unit/timezone.test.js", additions: 45, deletions: 0 },
    ],
    committed_at: "2022-11-09T13:40:00Z",
  },
  {
    hash: "b8c9d0e1f2a3",
    author_name: "hghluwigihghluwigi",
    author_email: "hghluwigihghluwigi@example.com",
    message:
      "refactor: extract locale handling into separate module for tree-shaking",
    files_changed: [
      { path: "src/locale.js", additions: 156, deletions: 0 },
      { path: "src/index.js", additions: 10, deletions: 67 },
      { path: "src/constants.js", additions: 0, deletions: 0 },
    ],
    committed_at: "2023-03-14T13:30:00Z",
  },
  {
    hash: "2f3a4b5c6d7e",
    author_name: "dependabot[bot]",
    author_email: "dependabot@example.com",
    message: "chore: bump typescript from 4.9.5 to 5.0.3",
    files_changed: [
      { path: "package.json", additions: 1, deletions: 1 },
    ],
    committed_at: "2023-05-22T07:00:00Z",
  },
  {
    hash: "3a4b5c6d7e8f",
    author_name: "contributor02",
    author_email: "c02@example.com",
    message: "feat: add isYesterday, isToday, isTomorrow convenience methods",
    files_changed: [
      { path: "src/index.js", additions: 24, deletions: 0 },
      { path: "types/index.d.ts", additions: 6, deletions: 0 },
      { path: "test/unit/core.test.js", additions: 52, deletions: 0 },
    ],
    committed_at: "2023-08-11T15:00:00Z",
  },
  {
    hash: "4b5c6d7e8f9a",
    author_name: "hghluwigihghluwigi",
    author_email: "hghluwigihghluwigi@example.com",
    message: "build: migrate from rollup to tsup for faster builds",
    files_changed: [
      { path: "package.json", additions: 8, deletions: 6 },
      { path: "tsup.config.ts", additions: 18, deletions: 0 },
      { path: "rollup.config.js", additions: 0, deletions: 32 },
      { path: "tsconfig.json", additions: 4, deletions: 2 },
    ],
    committed_at: "2024-01-10T12:00:00Z",
  },
  {
    hash: "5c6d7e8f9a0b",
    author_name: "contributor03",
    author_email: "c03@example.com",
    message: "docs: improve README with migration guide from Moment.js",
    files_changed: [
      { path: "README.md", additions: 85, deletions: 12 },
      { path: "docs/migration-from-moment.md", additions: 312, deletions: 0 },
    ],
    committed_at: "2024-03-28T09:45:00Z",
  },
];