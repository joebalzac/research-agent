const form = document.getElementById("research-form");
const submitBtn = document.getElementById("submit");
const statusEl = document.getElementById("status");
const reportEl = document.getElementById("report");
const sourcesEl = document.getElementById("sources");

function addStatusLine(text, className = "") {
  const line = document.createElement("div");
  if (className) line.className = className;
  line.textContent = text;
  statusEl.appendChild(line);
}

function renderSources(sources) {
  sourcesEl.innerHTML = "";
  if (!sources.length) return;

  const heading = document.createElement("h2");
  heading.textContent = "Sources";
  sourcesEl.appendChild(heading);

  const list = document.createElement("ul");
  for (const source of sources) {
    const li = document.createElement("li");
    if (source.type === "web" && source.url) {
      const a = document.createElement("a");
      a.href = source.url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = source.title || source.url;
      li.appendChild(a);
    } else {
      li.textContent = `${source.title} (local file)`;
    }
    list.appendChild(li);
  }
  sourcesEl.appendChild(list);
}

async function runResearch(question, dir) {
  statusEl.innerHTML = "";
  reportEl.textContent = "";
  sourcesEl.innerHTML = "";

  const response = await fetch("/api/research", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, dir }),
  });

  if (!response.ok || !response.body) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${response.status})`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let sources = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";

    for (const chunk of chunks) {
      const lines = chunk.split("\n");
      const eventLine = lines.find((l) => l.startsWith("event: "));
      const dataLine = lines.find((l) => l.startsWith("data: "));
      if (!dataLine) continue;

      const eventType = eventLine ? eventLine.slice("event: ".length) : "message";
      const payload = JSON.parse(dataLine.slice("data: ".length));

      switch (eventType) {
        case "status":
          addStatusLine(payload.message);
          break;
        case "tool_call":
          addStatusLine(`calling ${payload.tool}(${JSON.stringify(payload.input)})`, "tool-call");
          break;
        case "text":
          reportEl.textContent += payload.delta;
          break;
        case "source":
          sources.push(payload.source);
          break;
        case "done":
          if (payload.report) reportEl.textContent = payload.report;
          renderSources(payload.sources ?? sources);
          break;
        case "error":
          addStatusLine(`Error: ${payload.message}`);
          break;
      }
    }
  }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const question = document.getElementById("question").value.trim();
  const dir = document.getElementById("dir").value.trim();
  if (!question) return;

  submitBtn.disabled = true;
  submitBtn.textContent = "Researching...";

  try {
    await runResearch(question, dir);
  } catch (err) {
    addStatusLine(`Error: ${err.message}`);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Research";
  }
});
