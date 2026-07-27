import { AnimatePresence, motion } from "motion/react";
import { FileText, Globe } from "lucide-react";
import type { TimelineEntry } from "../lib/useResearchStream";
import { ToolCallCard } from "./ToolCallCard";

function StatusLine({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 py-1 text-sm text-neutral-500 dark:text-neutral-400">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />
      {message}
    </div>
  );
}

function SourceLine({ entry }: { entry: Extract<TimelineEntry, { kind: "source" }> }) {
  const Icon = entry.source.type === "web" ? Globe : FileText;
  return (
    <div className="flex items-center gap-2 py-1 text-sm text-neutral-500 dark:text-neutral-400">
      <Icon size={13} className="shrink-0 text-neutral-400" />
      <span className="truncate">{entry.source.title}</span>
    </div>
  );
}

export function AgentTimeline({ entries }: { entries: TimelineEntry[] }) {
  if (entries.length === 0) return null;

  return (
    <div aria-live="polite" className="flex flex-col gap-1.5">
      <AnimatePresence initial={false}>
        {entries.map((entry) => (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
          >
            {entry.kind === "status" && <StatusLine message={entry.message} />}
            {entry.kind === "tool_call" && (
              <ToolCallCard tool={entry.tool} input={entry.input} output={entry.output} />
            )}
            {entry.kind === "source" && <SourceLine entry={entry} />}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
