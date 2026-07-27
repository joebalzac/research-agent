import { useState } from "react";
import { Check, ChevronRight, FileText, Folder, Loader2, Search } from "lucide-react";
import { motion } from "motion/react";

const TOOL_ICON: Record<string, typeof Folder> = {
  list_directory: Folder,
  read_file: FileText,
  search_local_files: Search,
};

const TOOL_LABEL: Record<string, string> = {
  list_directory: "Listed directory",
  read_file: "Read file",
  search_local_files: "Searched local files",
};

const OUTPUT_PREVIEW_LIMIT = 2000;

interface Props {
  tool: string;
  input: Record<string, unknown>;
  output?: string;
}

function summarizeInput(input: Record<string, unknown>): string {
  if (typeof input.path === "string") return input.path;
  if (typeof input.query === "string") return `"${input.query}"`;
  return Object.values(input).map(String).join(", ");
}

export function ToolCallCard({ tool, input, output }: Props) {
  const [expanded, setExpanded] = useState(false);
  const Icon = TOOL_ICON[tool] ?? Folder;
  const label = TOOL_LABEL[tool] ?? tool;
  const done = output !== undefined;

  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm"
        aria-expanded={expanded}
      >
        <Icon size={14} className="shrink-0 text-neutral-400" />
        <span className="text-neutral-700 dark:text-neutral-300">{label}</span>
        <span className="truncate font-mono text-xs text-neutral-400">{summarizeInput(input)}</span>
        <span className="ml-auto flex shrink-0 items-center gap-1.5">
          {done ? (
            <Check size={14} className="text-emerald-600 dark:text-emerald-500" />
          ) : (
            <Loader2 size={14} className="animate-spin text-neutral-400" />
          )}
          <ChevronRight size={14} className={`text-neutral-400 transition-transform ${expanded ? "rotate-90" : ""}`} />
        </span>
      </button>

      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          transition={{ duration: 0.15 }}
          className="border-t border-neutral-200 px-3 py-2 dark:border-neutral-800"
        >
          <pre className="overflow-x-auto whitespace-pre-wrap break-words font-mono text-xs text-neutral-500 dark:text-neutral-400">
            {JSON.stringify(input, null, 2)}
          </pre>
          {output !== undefined && (
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words border-t border-dashed border-neutral-200 pt-2 font-mono text-xs text-neutral-600 dark:border-neutral-800 dark:text-neutral-300">
              {output.length > OUTPUT_PREVIEW_LIMIT ? `${output.slice(0, OUTPUT_PREVIEW_LIMIT)}…` : output}
            </pre>
          )}
        </motion.div>
      )}
    </div>
  );
}
