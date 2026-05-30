import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const buildPrompt = ({ repositorySummary, parsedFiles }) => {
  const formattedCodebase = parsedFiles
    .map(
      (file) => `FILE: ${file.path}
EXTENSION: ${file.extension || "[none]"}
SIZE: ${file.size} chars

${file.content}`,
    )
    .join("\n\n====================\n\n");

  return `
You are a principal software architect creating an onboarding-quality repository intelligence report.

Your audience is:
- a new joinee trying to understand the repository quickly
- an experienced engineer trying to find the architecture, key files, and execution flow fast

You must use ONLY the evidence from the provided repository summary and file contents.
When you mention files, always use their full relative paths exactly as provided.
Do not write generic advice. Be concrete and repo-specific.

Return ONLY valid JSON. Do not wrap it in markdown fences. Do not add commentary before or after the JSON.

Required JSON schema:
{
  "projectTitle": "string",
  "executiveSummary": "string",
  "repositoryOverview": {
    "purpose": "string",
    "businessDomain": "string",
    "primaryWorkflows": ["string"],
    "entryPoints": ["string"]
  },
  "techStack": {
    "languages": ["string"],
    "frameworks": ["string"],
    "runtimes": ["string"],
    "dataStores": ["string"],
    "infrastructure": ["string"],
    "tooling": ["string"]
  },
  "architecture": {
    "style": "string",
    "layers": [
      {
        "name": "string",
        "responsibilities": "string",
        "filePaths": ["string"]
      }
    ],
    "runtimeFlow": ["string"],
    "diagramMermaid": "string"
  },
  "folderStructure": {
    "topLevel": ["string"],
    "notableDirectories": [
      {
        "path": "string",
        "purpose": "string",
        "notableFiles": ["string"]
      }
    ]
  },
  "keyFiles": [
    {
      "path": "string",
      "purpose": "string",
      "whyItMatters": "string",
      "importantSymbols": ["string"],
      "relationships": ["string"]
    }
  ],
  "developerOnboarding": {
    "startHere": ["string"],
    "setupAndRun": ["string"],
    "debuggingTips": ["string"]
  },
  "risksAndGaps": ["string"],
  "suggestions": ["string"]
}

Strict output requirements:
- "architecture.diagramMermaid" must be VALID Mermaid flowchart syntax.
- Use ONLY simple node labels.
- Do NOT use parentheses (), brackets [], quotes "", apostrophes '', colons :, semicolons ;, or special symbols inside Mermaid node labels.
- Keep Mermaid node labels short (1 to 4 words only).
- Use alphanumeric text only in Mermaid node labels.
- Mermaid diagram must contain 6 to 12 nodes maximum.
- Use flowchart TD syntax only.
- Do not include markdown code fences around Mermaid.
- "keyFiles" must contain 8 to 15 files if enough evidence exists.
- "runtimeFlow" must explain how a request, job, CLI action, or user interaction moves through the system.
- "notableDirectories" must explain directory purpose, not just repeat the folder name.
- If evidence is missing, say "Not evident from provided files" instead of guessing.
- Keep values concise but meaningful.
- Avoid markdown headings, bullets, or code fences inside string values.

IMPORTANT:
Return ONLY valid Mermaid syntax.
Do not use parentheses, quotes, or special symbols inside Mermaid node labels.
Keep Mermaid node labels short and simple.

REPOSITORY SUMMARY:
TOTAL FILES: ${repositorySummary.totalFiles}
TOP LEVEL STRUCTURE:
${repositorySummary.topLevelStructure.join("\n")}

NOTABLE DIRECTORIES:
${repositorySummary.notableDirectories.join("\n")}

LANGUAGE SIGNALS:
${repositorySummary.languageSignals.join("\n")}

ENTRY POINT CANDIDATES:
${repositorySummary.entryPoints.join("\n")}

FOLDER TREE:
${repositorySummary.folderTree}

FILES:
${formattedCodebase}
`;
};

const extractJson = (text) => {
  const trimmed = text.trim();

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  throw new Error("Model response did not contain valid JSON.");
};

const buildFallbackAnalysis = (rawText, repositorySummary) => ({
  projectTitle: "Repository Analysis",
  executiveSummary:
    "Structured parsing failed for the model response. Review the raw analysis text.",
  repositoryOverview: {
    purpose: "Not evident from provided files",
    businessDomain: "Not evident from provided files",
    primaryWorkflows: ["Review raw analysis text"],
    entryPoints: repositorySummary.entryPoints,
  },
  techStack: {
    languages: repositorySummary.languageSignals,
    frameworks: [],
    runtimes: [],
    dataStores: [],
    infrastructure: [],
    tooling: [],
  },
  architecture: {
    style: "Not evident from provided files",
    layers: [],
    runtimeFlow: ["Review raw analysis text"],
    diagramMermaid: "",
  },
  folderStructure: {
    topLevel: repositorySummary.topLevelStructure,
    notableDirectories: [],
  },
  keyFiles: [],
  developerOnboarding: {
    startHere: ["Review README and detected entry points"],
    setupAndRun: [],
    debuggingTips: [],
  },
  risksAndGaps: ["The model returned unstructured output."],
  suggestions: [],
  rawText,
});

export const analyzeCodebase = async ({ repositorySummary, parsedFiles }) => {
  try {
    const modelNames = ["gemini-2.5-flash", "gemini-2.5-flash-lite"];
    const prompt = buildPrompt({ repositorySummary, parsedFiles });

    let lastError;

    for (const modelName of modelNames) {
      const model = genAI.getGenerativeModel({
        model: modelName,
      });

      for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
          const result = await model.generateContent(prompt);
          const response = await result.response;
          const rawText = response.text();
          let jsonText;

          try {
            jsonText = extractJson(rawText);
          } catch (error) {
            return {
              rawText,
              structured: buildFallbackAnalysis(rawText, repositorySummary),
            };
          }

          try {
            return {
              rawText,
              structured: JSON.parse(jsonText),
            };
          } catch {
            return {
              rawText,
              structured: buildFallbackAnalysis(rawText, repositorySummary),
            };
          }
        } catch (error) {
          lastError = error;

          const status = error?.status;

          const canRetrySameModel = status === 503 && attempt < 3;
          const canFallbackToNextModel =
            status === 503 && attempt === 3 && modelName !== modelNames.at(-1);

          if (canRetrySameModel) {
            const delayMs = 2000 * 2 ** (attempt - 1);

            console.log(
              `${modelName} overloaded. Retrying attempt ${attempt + 1} in ${delayMs}ms...`,
            );

            await sleep(delayMs);
            continue;
          }

          if (canFallbackToNextModel) {
            console.log(
              `${modelName} still overloaded after retries. Falling back to the next model...`,
            );
            break;
          }

          throw error;
        }
      }
    }

    throw lastError;
  } catch (error) {
    console.log("GEMINI ERROR:");
    console.log(error);

    throw error;
  }
};
