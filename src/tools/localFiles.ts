import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative, resolve, sep } from "node:path";
import type Anthropic from "@anthropic-ai/sdk";

const MAX_READ_CHARS = 20_000;
const MAX_SEARCH_MATCHES = 40;
const MAX_LIST_ENTRIES = 500;

const SKIP_DIR_NAMES = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  ".cache",
]);

const TEXT_EXTENSIONS = new Set([
  ".txt", ".md", ".mdx", ".rst", ".log",
  ".json", ".yaml", ".yml", ".toml", ".csv", ".tsv",
  ".html", ".htm", ".xml",
  ".js", ".jsx", ".ts", ".tsx", ".py", ".go", ".rb", ".java",
  ".c", ".cpp", ".h", ".hpp", ".rs", ".sh",
]);

export class LocalFileToolError extends Error {}

function safeResolve(root: string, relPath: string): string {
  const target = resolve(root, relPath || ".");
  const normalizedRoot = resolve(root);
  if (target !== normalizedRoot && !target.startsWith(normalizedRoot + sep)) {
    throw new LocalFileToolError(
      `Path "${relPath}" escapes the research root directory and is not allowed.`
    );
  }
  return target;
}

function isTextFile(path: string): boolean {
  return TEXT_EXTENSIONS.has(extname(path).toLowerCase());
}

export function listDirectory(root: string, relPath: string = "."): string {
  const dir = safeResolve(root, relPath);
  const stat = statSync(dir, { throwIfNoEntry: false });
  if (!stat) return `Path not found: ${relPath}`;
  if (!stat.isDirectory()) return `Not a directory: ${relPath}`;

  const entries = readdirSync(dir, { withFileTypes: true })
    .filter((e) => !SKIP_DIR_NAMES.has(e.name) && !e.name.startsWith("."))
    .slice(0, MAX_LIST_ENTRIES)
    .map((e) => (e.isDirectory() ? `${e.name}/` : e.name))
    .sort();

  if (entries.length === 0) return `(empty directory: ${relPath})`;
  return entries.join("\n");
}

export function readLocalFile(root: string, relPath: string): string {
  const file = safeResolve(root, relPath);
  const stat = statSync(file, { throwIfNoEntry: false });
  if (!stat) return `File not found: ${relPath}`;
  if (!stat.isFile()) return `Not a file: ${relPath}`;
  if (!isTextFile(file)) return `Unsupported file type (binary or unrecognized): ${relPath}`;

  const content = readFileSync(file, "utf-8");
  if (content.length > MAX_READ_CHARS) {
    return (
      content.slice(0, MAX_READ_CHARS) +
      `\n\n[... truncated, file has ${content.length} characters total ...]`
    );
  }
  return content;
}

function walk(dir: string, root: string, out: string[]): void {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIR_NAMES.has(entry.name)) continue;
      walk(full, root, out);
    } else if (entry.isFile() && isTextFile(full)) {
      out.push(full);
    }
  }
}

export function searchLocalFiles(root: string, relPath: string, query: string): string {
  const startDir = safeResolve(root, relPath || ".");
  const files: string[] = [];
  const stat = statSync(startDir, { throwIfNoEntry: false });
  if (!stat) return `Path not found: ${relPath}`;

  if (stat.isFile()) {
    files.push(startDir);
  } else {
    walk(startDir, root, files);
  }

  const needle = query.toLowerCase();
  const matches: string[] = [];

  for (const file of files) {
    if (matches.length >= MAX_SEARCH_MATCHES) break;
    let content: string;
    try {
      content = readFileSync(file, "utf-8");
    } catch {
      continue;
    }
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (matches.length >= MAX_SEARCH_MATCHES) break;
      if (lines[i].toLowerCase().includes(needle)) {
        const relFile = relative(root, file);
        matches.push(`${relFile}:${i + 1}: ${lines[i].trim()}`);
      }
    }
  }

  if (matches.length === 0) return `No matches for "${query}" under ${relPath || "."}`;
  const suffix = matches.length >= MAX_SEARCH_MATCHES ? "\n[... more matches truncated ...]" : "";
  return matches.join("\n") + suffix;
}

export const localFileTools: Anthropic.Tool[] = [
  {
    name: "list_directory",
    description:
      "List files and subdirectories at a path relative to the local research root directory. Use this to explore what documents are available before reading them.",
    input_schema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: 'Directory path relative to the research root, e.g. "." or "notes/2024".',
        },
      },
    },
  },
  {
    name: "read_file",
    description:
      "Read the full text contents of a local file at a path relative to the research root directory. Only plain-text-like files are supported (markdown, txt, code, json, csv, etc.), not binaries or PDFs.",
    input_schema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "File path relative to the research root.",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "search_local_files",
    description:
      "Case-insensitive text search across local files under a path relative to the research root directory. Returns matching lines with file path and line number. Use this to find relevant documents before reading them in full.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Text to search for.",
        },
        path: {
          type: "string",
          description: 'Directory (or file) to search under, relative to the research root. Defaults to "."',
        },
      },
      required: ["query"],
    },
  },
];

export function runLocalFileTool(root: string, name: string, input: Record<string, unknown>): string {
  try {
    switch (name) {
      case "list_directory":
        return listDirectory(root, (input.path as string) ?? ".");
      case "read_file":
        return readLocalFile(root, input.path as string);
      case "search_local_files":
        return searchLocalFiles(root, (input.path as string) ?? ".", input.query as string);
      default:
        return `Unknown local file tool: ${name}`;
    }
  } catch (err) {
    if (err instanceof LocalFileToolError) return `Error: ${err.message}`;
    return `Error: ${err instanceof Error ? err.message : String(err)}`;
  }
}
