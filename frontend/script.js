const form = document.querySelector("#analyze-form");
const repoUrlInput = document.querySelector("#repoUrl");
const submitButton = document.querySelector("#submitButton");
const resetButton = document.querySelector("#resetButton");
const analyzeAnotherButton = document.querySelector("#analyzeAnotherButton");
const statusText = document.querySelector("#statusText");
const feedback = document.querySelector("#feedback");
const resultMeta = document.querySelector("#resultMeta");
const resultStatus = document.querySelector("#resultStatus");
const analysisOutput = document.querySelector("#analysisOutput");

const API_URL = "http://localhost:3001/api/analyze";

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
  // Repository Overview Tab
  const overviewOutput = document.querySelector("#analysisOutput");

  overviewOutput.classList.remove("empty");

  overviewOutput.innerHTML = `
    <section>
      <h3>Repository Overview and Purpose</h3>

      <p>${formatInline(
        analysis.executiveSummary || "Not evident from provided files.",
      )}</p>

      <h4>Purpose</h4>

      <p>${formatInline(
        analysis.repositoryOverview?.purpose ||
          "Not evident from provided files.",
      )}</p>

      <h4>Business Domain</h4>

      <p>${formatInline(
        analysis.repositoryOverview?.businessDomain ||
          "Not evident from provided files.",
      )}</p>

      <h4>Primary Workflows</h4>

      ${renderList(analysis.repositoryOverview?.primaryWorkflows)}

      <h4>Entry Points</h4>

      ${renderList(
        analysis.repositoryOverview?.entryPoints?.length
          ? analysis.repositoryOverview.entryPoints
          : [repoUrl],
      )}
    </section>
  `;

  // Technology Stack Tab
  const techStackOutput = document.querySelector("#techStackOutput");

  techStackOutput.classList.remove("empty");

  techStackOutput.innerHTML = `
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
  `;

  // Build SVG Architecture Diagram
  const layers = analysis.architecture?.layers || [];

  const svgHeight = Math.max(420, layers.length * 95 + 120);

  const layerBoxes = layers
    .slice(0, 6)
    .map((layer, index) => {
      const y = 90 + index * 95;

      const fileText = (layer.filePaths || [])
        .slice(0, 2)
        .join(", ")
        .slice(0, 55);

      return `
        <rect
          x="170"
          y="${y}"
          width="460"
          height="56"
          rx="14"
          fill="#eef2ff"
          stroke="#7b72de"
          stroke-width="2"
        />

        <text
          x="400"
          y="${y + 23}"
          text-anchor="middle"
          font-size="13"
          font-weight="700"
          fill="#1c2340"
          font-family="Space Grotesk"
        >
          ${escapeHtml(layer.name || "Layer")}
        </text>

        <text
          x="400"
          y="${y + 40}"
          text-anchor="middle"
          font-size="9"
          fill="#6f7897"
          font-family="IBM Plex Mono"
        >
          ${escapeHtml(fileText)}
        </text>

        ${
          index < layers.length - 1
            ? `
          <line
            x1="400"
            y1="${y + 56}"
            x2="400"
            y2="${y + 95}"
            stroke="#7b72de"
            stroke-width="2.5"
            marker-end="url(#arrowhead)"
          />
        `
            : ""
        }
      `;
    })
    .join("");

  const architectureDiagram = `
    <svg
  class="architecture-diagram"
  viewBox="0 0 800 ${Math.max(250, layers.length * 110)}"
  preserveAspectRatio="xMidYMid meet"
  xmlns="http://www.w3.org/2000/svg"
>
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon
            points="0 0, 10 3.5, 0 7"
            fill="#7b72de"
          />
        </marker>
      </defs>

      <text
        x="400"
        y="45"
        text-anchor="middle"
        font-size="24"
        font-weight="700"
        fill="#5f67d8"
        font-family="Space Grotesk"
      >
        Repository Architecture
      </text>

      ${layerBoxes}
    </svg>
  `;

  // Code Flow Tab
  const codeFlowOutput = document.querySelector("#codeFlowOutput");

  codeFlowOutput.classList.remove("empty");

  codeFlowOutput.innerHTML = `
    <section>
  <div class="diagram-card">
    ${architectureDiagram}
  </div>
</section>

    <section>
      <h3>Code Flow and Architecture</h3>

      <h4>Architecture Style</h4>

      <p>${formatInline(
        analysis.architecture?.style || "Not evident from provided files.",
      )}</p>

      <h4>High-Level Flow</h4>

      ${renderList(analysis.architecture?.runtimeFlow, true)}

      <h4>Architecture Layers</h4>

      <div class="card-grid">
        ${renderLayers(analysis.architecture?.layers)}
      </div>
    </section>
  `;

  // Project Structure Tab
  const projectStructureOutput = document.querySelector(
    "#projectStructureOutput",
  );

  projectStructureOutput.classList.remove("empty");

  projectStructureOutput.innerHTML = `
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
  `;
};

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const repoUrl = repoUrlInput.value.trim();

  if (!repoUrl) {
    setFeedback("Please enter a repository URL.", "error");
    return;
  }

  clearFeedback();
  statusText.textContent =
    "Analyzing repository. This can take a little while for larger projects.";
  resultMeta.classList.remove("hidden");
  resultStatus.textContent = repoUrl;
  setResultReadyState(false);
  submitButton.disabled = true;
  submitButton.textContent = "Analyzing...";
  analysisOutput.className = "analysis-output empty";
  analysisOutput.innerHTML =
    '<p class="placeholder">Analysis in progress...</p>';

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ repoUrl }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || "Analysis request failed.");
    }

    resultStatus.textContent = repoUrl;
    statusText.textContent = "Analysis completed successfully.";
    setFeedback("Repository analyzed successfully.", "success");
    setResultReadyState(true);

    if (data.structuredAnalysis) {
      await renderStructuredAnalysis(data.structuredAnalysis, repoUrl);
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
  repoUrlInput.value = "Enter GitHub repository URL here";
  clearFeedback();
  statusText.textContent = "Ready for a repository URL.";
  setResultReadyState(false);
  resultMeta.classList.add("hidden");
  resultStatus.textContent = "";
  analysisOutput.className = "analysis-output empty";
  analysisOutput.innerHTML =
    '<p class="placeholder">Your analysis will appear here once the backend finishes.</p>';

  // Reset other tabs too
  const techStackOutput = document.querySelector("#techStackOutput");
  if (techStackOutput) {
    techStackOutput.className = "analysis-output empty";
    techStackOutput.innerHTML =
      '<p class="placeholder">Technology stack details will appear here once the backend finishes.</p>';
  }

  const codeFlowOutput = document.querySelector("#codeFlowOutput");
  if (codeFlowOutput) {
    codeFlowOutput.className = "analysis-output empty";
    codeFlowOutput.innerHTML =
      '<p class="placeholder">Code flow details will appear here once the backend finishes.</p>';
  }

  const projectStructureOutput = document.querySelector(
    "#projectStructureOutput",
  );
  if (projectStructureOutput) {
    projectStructureOutput.className = "analysis-output empty";
    projectStructureOutput.innerHTML =
      '<p class="placeholder">Project structure and key files will appear here once the backend finishes.</p>';
  }

  // Reset to first tab
  switchTab("repository-overview");
});

analyzeAnotherButton.addEventListener("click", () => {
  form.reset();

  repoUrlInput.value = "";
  repoUrlInput.focus();

  clearFeedback();

  statusText.textContent = "Ready for a repository URL.";

  setResultReadyState(false);

  resultMeta.classList.add("hidden");

  resultStatus.textContent = "";

  // Reset Repository Overview
  analysisOutput.className = "analysis-output empty";
  analysisOutput.innerHTML =
    '<p class="placeholder">Your analysis will appear here once the backend finishes.</p>';

  // Reset Technology Stack
  const techStackOutput = document.querySelector("#techStackOutput");

  if (techStackOutput) {
    techStackOutput.className = "analysis-output empty";

    techStackOutput.innerHTML =
      '<p class="placeholder">Technology stack details will appear here once the backend finishes.</p>';
  }

  // Reset Code Flow
  const codeFlowOutput = document.querySelector("#codeFlowOutput");

  if (codeFlowOutput) {
    codeFlowOutput.className = "analysis-output empty";

    codeFlowOutput.innerHTML =
      '<p class="placeholder">Code flow details will appear here once the backend finishes.</p>';
  }

  // Reset Project Structure
  const projectStructureOutput = document.querySelector(
    "#projectStructureOutput",
  );

  if (projectStructureOutput) {
    projectStructureOutput.className = "analysis-output empty";

    projectStructureOutput.innerHTML =
      '<p class="placeholder">Project structure and key files will appear here once the backend finishes.</p>';
  }

  // Reset Architecture Diagram
  const architectureDiagramContainer = document.getElementById(
    "architectureDiagramContainer",
  );

  if (architectureDiagramContainer) {
    architectureDiagramContainer.innerHTML = "";
  }

  // Switch back to first tab
  switchTab("repository-overview");

  // Scroll to top
  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
});

// Tab Switching Functionality
const tabButtons = document.querySelectorAll(".tab-button");
const tabPanes = document.querySelectorAll(".tab-pane");

const switchTab = (tabName) => {
  // Remove active state from all buttons and panes
  tabButtons.forEach((button) => button.classList.remove("active"));
  tabPanes.forEach((pane) => pane.classList.remove("active"));

  // Add active state to clicked button and corresponding pane
  document.querySelector(`[data-tab="${tabName}"]`)?.classList.add("active");
  document.getElementById(tabName)?.classList.add("active");

  // Re-render mermaid charts if on code-flow tab
  if (tabName === "code-flow") {
    setTimeout(() => {
      renderMermaidCharts();
    }, 0);
  }
};

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const tabName = button.getAttribute("data-tab");
    switchTab(tabName);
  });
});
