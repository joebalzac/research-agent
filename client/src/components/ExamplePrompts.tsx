const EXAMPLES = [
  "What year did the first iPhone ship, and who announced it?",
  "What are the latest developments in solid-state EV batteries?",
  "Compare React Server Components to traditional SSR — tradeoffs and when each makes sense.",
];

interface Props {
  onSelect: (question: string) => void;
}

export function ExamplePrompts({ onSelect }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {EXAMPLES.map((example) => (
        <button
          key={example}
          type="button"
          onClick={() => onSelect(example)}
          className="rounded-full border border-neutral-200 px-3 py-1.5 text-left text-sm text-neutral-600 transition-colors hover:border-neutral-300 hover:bg-neutral-100 hover:text-neutral-900 dark:border-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:bg-neutral-900 dark:hover:text-neutral-100"
        >
          {example}
        </button>
      ))}
    </div>
  );
}
