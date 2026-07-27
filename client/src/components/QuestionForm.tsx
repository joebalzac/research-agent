import { useState } from "react";
import { ChevronDown, FolderSearch, Square } from "lucide-react";
import type { Phase } from "../lib/useResearchStream";

interface Props {
  phase: Phase;
  question: string;
  onQuestionChange: (value: string) => void;
  onSubmit: (question: string, dir: string) => void;
  onCancel: () => void;
}

export function QuestionForm({ phase, question, onQuestionChange, onSubmit, onCancel }: Props) {
  const [dir, setDir] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const isRunning = phase === "running";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!question.trim() || isRunning) return;
        onSubmit(question.trim(), dir.trim());
      }}
      className="flex flex-col gap-3"
    >
      <label htmlFor="question" className="sr-only">
        Research question
      </label>
      <textarea
        id="question"
        value={question}
        onChange={(e) => onQuestionChange(e.target.value)}
        placeholder="Ask a question…"
        rows={3}
        required
        className="w-full resize-y rounded-xl border border-neutral-200 bg-white px-4 py-3 text-base text-neutral-900 shadow-sm outline-none transition-colors placeholder:text-neutral-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100 dark:placeholder:text-neutral-500"
      />

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
          aria-expanded={showAdvanced}
        >
          <FolderSearch size={14} />
          Local folder
          <ChevronDown size={14} className={`transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
        </button>

        {isRunning ? (
          <button
            key="stop"
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-900"
          >
            <Square size={14} /> Stop
          </button>
        ) : (
          <button
            key="submit"
            type="submit"
            disabled={!question.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Research
          </button>
        )}
      </div>

      {showAdvanced && (
        <div className="flex flex-col gap-1">
          <label htmlFor="dir" className="text-xs text-neutral-500 dark:text-neutral-400">
            Local documents folder (optional) — an absolute path the agent may search and read
          </label>
          <input
            id="dir"
            type="text"
            value={dir}
            onChange={(e) => setDir(e.target.value)}
            placeholder="/path/to/local/docs"
            className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
          />
        </div>
      )}
    </form>
  );
}
