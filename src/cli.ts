import "dotenv/config";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { runResearch } from "./agent.js";

function parseArgs(argv: string[]) {
  const args = { question: "", dir: undefined as string | undefined, out: undefined as string | undefined };
  const rest: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dir") {
      args.dir = argv[++i];
    } else if (arg === "--out") {
      args.out = argv[++i];
    } else {
      rest.push(arg);
    }
  }

  args.question = rest.join(" ").trim();
  return args;
}

function printUsage() {
  console.log(`Usage: npm run cli -- "<research question>" [--dir <local-docs-path>] [--out <report.md>]

  --dir   Local directory of documents the agent may search and read
  --out   Write the final Markdown report to this file
`);
}

async function main() {
  const { question, dir, out } = parseArgs(process.argv.slice(2));

  if (!question) {
    printUsage();
    process.exit(1);
  }

  const rootDir = dir ? resolve(dir) : undefined;

  console.log(`Researching: ${question}`);
  if (rootDir) console.log(`Local research root: ${rootDir}`);
  console.log("");

  let printedAnyText = false;

  try {
    const { report, sources } = await runResearch({
      question,
      rootDir,
      onEvent: (event) => {
        switch (event.type) {
          case "status":
            process.stdout.write(`\n[${event.message}]\n`);
            break;
          case "tool_call":
            process.stdout.write(`\n[calling ${event.tool}(${JSON.stringify(event.input)})]\n`);
            break;
          case "text":
            process.stdout.write(event.delta);
            printedAnyText = true;
            break;
          case "error":
            console.error(`\nError: ${event.message}`);
            break;
        }
      },
    });

    if (!printedAnyText) {
      console.log(report);
    }

    if (sources.length > 0) {
      console.log("\n\nSources:");
      for (const source of sources) {
        console.log(source.type === "web" ? `- ${source.title} (${source.url})` : `- ${source.title} (local)`);
      }
    }

    if (out) {
      const outPath = resolve(out);
      writeFileSync(outPath, report, "utf-8");
      console.log(`\nReport saved to ${outPath}`);
    }
  } catch {
    // Already reported via the onEvent "error" handler above.
    process.exit(1);
  }
}

main();
