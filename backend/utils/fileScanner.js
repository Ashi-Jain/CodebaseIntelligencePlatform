import fs from "fs-extra";
import path from "path";

export const scanRepository = async (dir) => {
  let results = [];

  const items = await fs.readdir(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);

    const stat = await fs.stat(fullPath);

    // Ignore useless folders
    if (
      item === "node_modules" ||
      item === ".git" ||
      item === "dist" ||
      item === "build"
    ) {
      continue;
    }

    if (stat.isDirectory()) {
      const nested = await scanRepository(fullPath);
      results = results.concat(nested);
    } else {
      results.push(fullPath);
    }
  }

  return results;
};
