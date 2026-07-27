import { useState } from "react";
import { Sparkles } from "lucide-react";
import { useResearchStream } from "./lib/useResearchStream";
import { QuestionForm } from "./components/QuestionForm";
import { ExamplePrompts } from "./components/ExamplePrompts";
import { AgentTimeline } from "./components/AgentTimeline";
import { ReportView } from "./components/ReportView";
import { SourcesList } from "./components/SourcesList";
import { ThemeToggle } from "./components/ThemeToggle";

function App() {
  const [question, setQuestion] = useState("");
  const { phase, timeline, streamingText, report, sources, errorMessage, start, cancel } = useResearchStream();

  const hasRun = phase !== "idle";
  const displayedText = phase === "done" ? report : streamingText;

  return (
    <div className="mx-auto flex min-h-svh max-w-2xl flex-col px-4 py-10 sm:px-6">
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-blue-700 dark:text-blue-400" />
          <h1 className="text-lg font-semibold tracking-tight">Research Agent</h1>
        </div>
        <ThemeToggle />
      </header>

      <QuestionForm
        phase={phase}
        question={question}
        onQuestionChange={setQuestion}
        onSubmit={(q, dir) => start(q, dir)}
        onCancel={cancel}
      />

      {!hasRun && (
        <div className="mt-6">
          <ExamplePrompts onSelect={setQuestion} />
        </div>
      )}

      {hasRun && (
        <div className="mt-8 flex flex-col gap-6">
          <AgentTimeline entries={timeline} />

          {phase === "cancelled" && <p className="text-sm text-neutral-400 dark:text-neutral-500">Research cancelled.</p>}

          {phase === "error" && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400"
            >
              {errorMessage}
            </div>
          )}

          <ReportView text={displayedText} streaming={phase === "running"} />
          {phase === "done" && <SourcesList sources={sources} />}
        </div>
      )}
    </div>
  );
}

export default App;
