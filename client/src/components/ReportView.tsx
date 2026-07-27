import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { stripTrailingSourcesSection } from "../lib/markdown";

interface Props {
  text: string;
  streaming: boolean;
}

export function ReportView({ text, streaming }: Props) {
  if (!text) return null;
  const content = stripTrailingSourcesSection(text);

  return (
    <div className="prose prose-neutral dark:prose-invert prose-headings:font-semibold prose-a:text-blue-700 dark:prose-a:text-blue-400 max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      {streaming && (
        <span
          className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-blue-600 align-middle"
          aria-hidden="true"
        />
      )}
    </div>
  );
}
