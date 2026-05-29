const form = document.querySelector("#analyze-form");
const repoUrlInput = document.querySelector("#repoUrl");
const apiUrlInput = document.querySelector("#apiUrl");
const submitButton = document.querySelector("#submitButton");
const resetButton = document.querySelector("#resetButton");
const analyzeAnotherButton = document.querySelector("#analyzeAnotherButton");
const statusText = document.querySelector("#statusText");
const feedback = document.querySelector("#feedback");
const resultMeta = document.querySelector("#resultMeta");
const resultStatus = document.querySelector("#resultStatus");
const resultDuration = document.querySelector("#resultDuration");
const analysisOutput = document.querySelector("#analysisOutput");

let mermaidRendererPromise;

const setFeedback = (message, type) => {
  feedback.textContent = message;
  feedback.className = `feedback ${type}`;
};

const clearFeedback = () => {
  feedback.textContent = "";
  feedback.className = "feedback hidden";
};

const setResultReadyState = (isReady) => {
  analyzeAnotherButton.classList.toggle("hidden", !isReady);
};

const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const formatInline = (value = "") => {
  const escaped = escapeHtml(value);

  return escaped
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
};

const ensureMermaid = async () => {
  if (!mermaidRendererPromise) {
    mermaidRendererPromise = import(
      "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs"
    )
      .then((module) => {
        module.default.initialize({
          startOnLoad: false,
          theme: "base",
          themeVariables: {
            primaryColor: "#eef2ff",
            primaryTextColor: "#1c2340",
            primaryBorderColor: "#7b72de",
            lineColor: "#8d67cf",
            secondaryColor: "#f8f9ff",
            tertiaryColor: "#ffffff",
            fontFamily: "Space Grotesk, sans-serif",
          },
        });

        return module.default;
      })
      .catch(() => null);
  }

  return mermaidRendererPromise;
};

const renderMermaidCharts = async () => {
  const mermaid = await ensureMermaid();

  if (!mermaid) {
    return;
  }

  const diagrams = [...analysisOutput.querySelectorAll("[data-mermaid-source]")];

  for (const [index, element] of diagrams.entries()) {
    const source = element.dataset.mermaidSource;

    if (!source) {
      continue;
    }

    try {
      const { svg } = await mermaid.render(`repo-diagram-${index}`, source);
      element.innerHTML = svg;
    } catch (error) {
      element.innerHTML = `<pre>${escapeHtml(source)}</pre>`;
    }
  }
};

const renderList = (items, ordered = false) => {
  if (!Array.isArray(items) || items.length === 0) {
    return "<p>Not evident from provided files.</p>";
  }

  const tag = ordered ? "ol" : "ul";
  return `<${tag}>${items.map((item) => `<li>${formatInline(String(item))}</li>`).join("")}</${tag}>`;
};

const renderInlineGroup = (label, items) => {
  if (!Array.isArray(items) || items.length === 0) {
    return "";
  }

  return `
    <div class="inline-group">
      <span class="inline-group-label">${escapeHtml(label)}</span>
      <div class="chip-row">
        ${items.map((item) => `<span class="info-chip">${formatInline(String(item))}</span>`).join("")}
      </div>
    </div>
  `;
};

const renderKeyFiles = (keyFiles) => {
  if (!Array.isArray(keyFiles) || keyFiles.length === 0) {
    return "<p>Key-file analysis was not available for this repository.</p>";
  }

  return keyFiles
    .map(
      (file) => `
        <div class="key-file-card">
          <h4><code>${escapeHtml(file.path || "Unknown file")}</code></h4>
          <p><strong>Purpose:</strong> ${formatInline(file.purpose || "Not evident from provided files")}</p>
          <p><strong>Why it matters:</strong> ${formatInline(file.whyItMatters || "Not evident from provided files")}</p>
          ${renderInlineGroup("Important symbols", file.importantSymbols)}
          ${renderInlineGroup("Relationships", file.relationships)}
        </div>
      `,
    )
    .join("");
};

const renderDirectoryCards = (directories) => {
  if (!Array.isArray(directories) || directories.length === 0) {
    return "<p>Notable directories were not identified from the provided files.</p>";
  }

  return directories
    .map(
      (directory) => `
        <div class="directory-card">
          <h4><code>${escapeHtml(directory.path || "Unknown path")}</code></h4>
          <p>${formatInline(directory.purpose || "Not evident from provided files")}</p>
          ${renderInlineGroup("Notable files", directory.notableFiles)}
        </div>
      `,
    )
    .join("");
};

const renderLayers = (layers) => {
  if (!Array.isArray(layers) || layers.length === 0) {
    return "<p>Architecture layers were not identified from the provided files.</p>";
  }

  return layers
    .map(
      (layer) => `
        <div class="layer-card">
          <h4>${formatInline(layer.name || "Unnamed layer")}</h4>
          <p>${formatInline(layer.responsibilities || "Not evident from provided files")}</p>
          ${renderInlineGroup("Files", layer.filePaths)}
        </div>
      `,
    )
    .join("");
};

const renderStructuredAnalysis = async (analysis, repoUrl) => {
  analysisOutput.classList.remove("empty");

  analysisOutput.innerHTML = `
    <section>
      <h3>Repository Overview and Purpose</h3>
      <p>${formatInline(analysis.executiveSummary || "Not evident from provided files.")}</p>
      <h4>Purpose</h4>
      <p>${formatInline(analysis.repositoryOverview?.purpose || "Not evident from provided files.")}</p>
      <h4>Business Domain</h4>
      <p>${formatInline(analysis.repositoryOverview?.businessDomain || "Not evident from provided files.")}</p>
      <h4>Primary Workflows</h4>
      ${renderList(analysis.repositoryOverview?.primaryWorkflows)}
      <h4>Entry Points</h4>
      ${renderList(analysis.repositoryOverview?.entryPoints?.length ? analysis.repositoryOverview.entryPoints : [repoUrl])}
    </section>

    <section>
      <h3>Technology Stack and Frameworks Used</h3>
      <div class="two-column-grid">
        <div>
          <h4>Languages</h4>
          ${renderList(analysis.techStack?.languages)}
          <h4>Frameworks</h4>
          ${renderList(analysis.techStack?.frameworks)}
          <h4>Runtimes</h4>
          ${renderList(analysis.techStack?.runtimes)}
        </div>
        <div>
          <h4>Data Stores</h4>
          ${renderList(analysis.techStack?.dataStores)}
          <h4>Infrastructure</h4>
          ${renderList(analysis.techStack?.infrastructure)}
          <h4>Tooling</h4>
          ${renderList(analysis.techStack?.tooling)}
        </div>
      </div>
    </section>

    <section>
      <h3>Code Flow and Architecture Diagram</h3>
      <h4>Architecture Style</h4>
      <p>${formatInline(analysis.architecture?.style || "Not evident from provided files.")}</p>
      <h4>High-Level Flow</h4>
      ${renderList(analysis.architecture?.runtimeFlow, true)}
      <h4>Architecture Layers</h4>
      <div class="card-grid">
        ${renderLayers(analysis.architecture?.layers)}
      </div>
      <h4>Architecture Diagram</h4>
      ${
        analysis.architecture?.diagramMermaid
          ? `<div class="diagram-card"><div class="diagram-host" data-mermaid-source="${escapeHtml(
              analysis.architecture.diagramMermaid,
            )}"></div></div>`
          : "<p>No architecture diagram was generated.</p>"
      }
    </section>

    <section>
      <h3>Project Structure and Key Files</h3>
      <h4>Top-Level Structure</h4>
      ${renderList(analysis.folderStructure?.topLevel)}
      <h4>Notable Directories</h4>
      <div class="card-grid">
        ${renderDirectoryCards(analysis.folderStructure?.notableDirectories)}
      </div>
      <h4>Important Files</h4>
      <div class="stack-grid">
        ${renderKeyFiles(analysis.keyFiles)}
      </div>
    </section>

    <section>
      <h3>New Joiner Notes</h3>
      <h4>Start Here</h4>
      ${renderList(analysis.developerOnboarding?.startHere)}
      <h4>Setup and Run</h4>
      ${renderList(analysis.developerOnboarding?.setupAndRun)}
      <h4>Debugging Tips</h4>
      ${renderList(analysis.developerOnboarding?.debuggingTips)}
    </section>

    <section>
      <h3>Risks and Suggestions</h3>
      <h4>Risks and Gaps</h4>
      ${renderList(analysis.risksAndGaps)}
      <h4>Suggestions</h4>
      ${renderList(analysis.suggestions)}
      ${
        analysis.rawText
          ? `<details class="raw-analysis"><summary>Raw model output</summary><pre>${escapeHtml(
              analysis.rawText,
            )}</pre></details>`
          : ""
      }
    </section>
  `;

  await renderMermaidCharts();
};

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const repoUrl = repoUrlInput.value.trim();
  const apiUrl = apiUrlInput.value.trim();

  if (!repoUrl || !apiUrl) {
    setFeedback("Please enter both the repository URL and the backend API URL.", "error");
    return;
  }

  clearFeedback();
  statusText.textContent = "Analyzing repository. This can take a little while for larger projects.";
  resultMeta.classList.remove("hidden");
  resultStatus.textContent = repoUrl;
  resultDuration.textContent = "Starting...";
  setResultReadyState(false);
  submitButton.disabled = true;
  submitButton.textContent = "Analyzing...";
  analysisOutput.className = "analysis-output empty";
  analysisOutput.innerHTML = '<p class="placeholder">Analysis in progress...</p>';

  const startedAt = performance.now();

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ repoUrl }),
    });

    const data = await response.json();
    const durationInSeconds = ((performance.now() - startedAt) / 1000).toFixed(1);

    resultDuration.textContent = `${durationInSeconds}s`;

    if (!response.ok || !data.success) {
      throw new Error(data.error || "Analysis request failed.");
    }

    resultStatus.textContent = repoUrl;
    statusText.textContent = "Analysis completed successfully.";
    setFeedback("Repository analyzed successfully.", "success");
    setResultReadyState(true);

    if (data.structuredAnalysis) {
      await renderStructuredAnalysis(
        {
          ...data.structuredAnalysis,
          rawText: data.analysis,
        },
        repoUrl,
      );
    } else {
      analysisOutput.classList.remove("empty");
      analysisOutput.innerHTML = `<pre>${escapeHtml(data.analysis || "No analysis returned.")}</pre>`;
    }
  } catch (error) {
    resultStatus.textContent = repoUrl || "Unavailable";
    statusText.textContent = "Analysis could not be completed.";
    setFeedback(error.message, "error");
    analysisOutput.className = "analysis-output empty";
    analysisOutput.innerHTML =
      '<p class="placeholder">No analysis available. Please review the error above and try again.</p>';
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Analyze Repository";
  }
});

resetButton.addEventListener("click", () => {
  form.reset();
  repoUrlInput.value = "https://github.com/vercel/serve";
  apiUrlInput.value = "http://localhost:3001/api/analyze";
  clearFeedback();
  statusText.textContent = "Ready for a repository URL.";
  setResultReadyState(false);
  resultMeta.classList.add("hidden");
  resultStatus.textContent = "Idle";
  resultDuration.textContent = "0s";
  analysisOutput.className = "analysis-output empty";
  analysisOutput.innerHTML =
    '<p class="placeholder">Your analysis will appear here once the backend finishes.</p>';
});

analyzeAnotherButton.addEventListener("click", () => {
  repoUrlInput.focus();
  window.scrollTo({ top: 0, behavior: "smooth" });
});
