import type { ImportGraph } from "../types";

export const dayjsImportGraph: ImportGraph[] = [
  // Core module dependencies
  { source_file: "src/index.js", target_file: "src/constants.js", import_type: "relative" },
  { source_file: "src/index.js", target_file: "src/utils.js", import_type: "relative" },
  { source_file: "src/index.js", target_file: "src/locale.js", import_type: "relative" },
  { source_file: "src/utils.js", target_file: "src/constants.js", import_type: "relative" },
  { source_file: "src/locale.js", target_file: "src/constants.js", import_type: "relative" },
  { source_file: "src/locale.js", target_file: "src/utils.js", import_type: "relative" },

  // Plugin → core
  { source_file: "src/plugin/advancedFormat.js", target_file: "src/index.js", import_type: "relative" },
  { source_file: "src/plugin/relativeTime.js", target_file: "src/index.js", import_type: "relative" },
  { source_file: "src/plugin/weekOfYear.js", target_file: "src/index.js", import_type: "relative" },
  { source_file: "src/plugin/customParseFormat.js", target_file: "src/index.js", import_type: "relative" },
  { source_file: "src/plugin/timezone.js", target_file: "src/index.js", import_type: "relative" },
  { source_file: "src/plugin/timezone.js", target_file: "src/utils.js", import_type: "relative" },

  // Plugin → plugin
  { source_file: "src/plugin/timezone.js", target_file: "src/plugin/advancedFormat.js", import_type: "relative" },
  { source_file: "src/plugin/relativeTime.js", target_file: "src/plugin/advancedFormat.js", import_type: "relative" },

  // Core → plugin (dynamic extension)
  { source_file: "src/index.js", target_file: "src/plugin/advancedFormat.js", import_type: "relative" },
  { source_file: "src/index.js", target_file: "src/plugin/customParseFormat.js", import_type: "relative" },

  // Type definitions
  { source_file: "types/index.d.ts", target_file: "src/constants.js", import_type: "relative" },

  // External dependencies
  { source_file: "src/index.js", target_file: "dayjs", import_type: "bare" },
  { source_file: "src/plugin/timezone.js", target_file: "dayjs", import_type: "bare" },
];