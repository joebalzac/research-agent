import { FileText, Globe } from "lucide-react";
import type { Source } from "../lib/events";

function domainFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function SourceChip({ source }: { source: Source }) {
  if (source.type === "web" && source.url) {
    return (
      <a
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs text-neutral-600 transition-colors hover:border-blue-600 hover:text-blue-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:border-blue-500 dark:hover:text-blue-400"
      >
        <Globe size={12} className="shrink-0" />
        <span className="truncate">{source.title || domainFromUrl(source.url)}</span>
      </a>
    );
  }

  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
      <FileText size={12} className="shrink-0" />
      <span className="truncate font-mono">{source.title}</span>
    </span>
  );
}
