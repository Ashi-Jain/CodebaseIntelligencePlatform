import express from "express";

import { cloneRepository } from "../services/githubService.js";
import { scanRepository } from "../utils/fileScanner.js";
import { filterImportantFiles } from "../services/filterService.js";
import { parseFiles } from "../services/parserService.js";
import { analyzeCodebase } from "../services/geminiService.js";
import { buildRepositorySummary } from "../utils/repositorySummary.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { repoUrl } = req.body;

    console.log("STEP 1 → Cloning repository...");
    const repoPath = await cloneRepository(repoUrl);

    console.log("STEP 2 → Scanning files...");
    const allFiles = await scanRepository(repoPath);

    console.log("Total files:", allFiles.length);

    console.log("STEP 3 → Building repository summary...");
    const repositorySummary = buildRepositorySummary(repoPath, allFiles);

    console.log("STEP 4 → Filtering files...");
    const importantFiles = await filterImportantFiles(allFiles, repoPath);

    console.log("Important files:", importantFiles.length);

    console.log("STEP 5 → Parsing files...");
    const parsedCode = await parseFiles(importantFiles, repoPath);

    console.log("STEP 6 → Gemini analysis...");
    const analysis = await analyzeCodebase({
      repositorySummary,
      parsedFiles: parsedCode,
    });

    res.json({
      success: true,
      analysis: analysis.rawText,
      structuredAnalysis: analysis.structured,
      repositorySummary,
    });
  } catch (error) {
    console.log("FULL ERROR:");
    console.log(error);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
