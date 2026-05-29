import fs from "fs-extra";
import path from "path";

const HIGH_SIGNAL_FILE_NAMES = [
  "package.json",
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "readme",
  "dockerfile",
  "docker-compose",
  ".env.example",
  "tsconfig",
  "vite.config",
  "next.config",
  "nuxt.config",
  "angular.json",
  "pom.xml",
  "build.gradle",
  "requirements.txt",
  "pyproject.toml",
  "go.mod",
  "cargo.toml",
];

export const filterImportantFiles = async (files, repoPath = "") => {
  const scoredFiles = [];

  for (const file of files) {
    let score = 0;

    try {
      const content = await fs.readFile(file, "utf-8");

      const relativePath = repoPath ? path.relative(repoPath, file) : file;
      const normalizedPath = relativePath.split(path.sep).join("/").toLowerCase();
      const fileName = path.basename(file).toLowerCase();
      const extension = path.extname(fileName);

      // =================================
      // FILE NAME IMPORTANCE
      // =================================

      if (HIGH_SIGNAL_FILE_NAMES.some((name) => normalizedPath.includes(name))) score += 110;

      if (fileName.includes("readme")) score += 90;

      if (fileName.includes("server")) score += 75;

      if (fileName.includes("app.")) score += 75;

      if (fileName.includes("main.")) score += 75;

      if (fileName.includes("index.")) score += 65;

      if (fileName.includes("controller")) score += 55;

      if (fileName.includes("service")) score += 55;

      if (fileName.includes("route")) score += 50;

      if (fileName.includes("model")) score += 45;

      if (fileName.includes("schema")) score += 45;

      if (fileName.includes("config")) score += 40;

      if (fileName.includes("test")) score += 20;

      // =================================
      // FOLDER IMPORTANCE
      // =================================

      if (normalizedPath.includes("/src/")) score += 45;

      if (normalizedPath.includes("/controllers/")) score += 55;

      if (normalizedPath.includes("/services/")) score += 55;

      if (normalizedPath.includes("/routes/")) score += 55;

      if (normalizedPath.includes("/models/")) score += 50;

      if (normalizedPath.includes("/components/")) score += 45;

      if (normalizedPath.includes("/pages/")) score += 45;

      if (normalizedPath.includes("/hooks/")) score += 35;

      if (normalizedPath.includes("/lib/")) score += 35;

      if (normalizedPath.includes("/utils/")) score += 30;

      // =================================
      // CODE PATTERNS
      // =================================

      const importMatches = (content.match(/import /g) || []).length;

      score += importMatches * 5;

      const exportMatches = (content.match(/export /g) || []).length;

      score += exportMatches * 5;

      const functionMatches = (content.match(/function /g) || []).length;

      score += functionMatches * 3;

      // =================================
      // FRAMEWORK DETECTION
      // =================================

      if (content.includes("express(")) score += 40;

      if (content.includes("React")) score += 40;

      if (content.includes("router")) score += 20;

      if (content.includes("app.listen")) score += 50;

      if (content.includes("router.post") || content.includes("router.get")) score += 35;

      if (content.includes("class ")) score += 20;

      if (content.includes("useEffect")) score += 20;

      if (content.includes("async ")) score += 10;

      // =================================
      // FILE SIZE
      // =================================

      const sizeWeight = Math.min(content.length / 1000, 20);

      score += sizeWeight;

      if ([".md", ".json", ".yml", ".yaml", ".toml", ".env", ".xml"].includes(extension)) {
        score += 12;
      }

      scoredFiles.push({
        file,
        relativePath: normalizedPath,
        score,
      });
    } catch (error) {
      console.log("Scoring error:", file);
    }
  }

  // =================================
  // SORT BY SCORE
  // =================================

  scoredFiles.sort((a, b) => b.score - a.score);

  // =================================
  // TAKE TOP FILES
  // =================================

  const deduped = [];
  const directoryCounts = new Map();

  for (const item of scoredFiles) {
    const directory = item.relativePath.split("/").slice(0, -1).join("/") || ".";
    const existingCount = directoryCounts.get(directory) || 0;

    if (existingCount >= 6) {
      continue;
    }

    deduped.push(item.file);
    directoryCounts.set(directory, existingCount + 1);

    if (deduped.length >= 35) {
      break;
    }
  }

  return deduped;
};
