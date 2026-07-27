import type { Source } from "../lib/events";
import { SourceChip } from "./SourceChip";

export function SourcesList({ sources }: { sources: Source[] }) {
  if (sources.length === 0) return null;

  return (
    <div className="border-t border-neutral-200 pt-4 dark:border-neutral-800">
      <h2 className="mb-2 text-xs font-medium tracking-wide text-neutral-400 uppercase dark:text-neutral-500">
        Sources
      </h2>
      <div className="flex flex-wrap gap-1.5">
        {sources.map((source) => (
          <SourceChip key={`${source.type}:${source.url ?? source.title}`} source={source} />
        ))}
      </div>
    </div>
  );
}
