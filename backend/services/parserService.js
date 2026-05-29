import fs from "fs-extra";
import path from "path";

const buildExcerpt = (content, maxLength = 12000) => {
  if (content.length <= maxLength) {
    return content;
  }

  const headLength = Math.floor(maxLength * 0.7);
  const tailLength = maxLength - headLength;

  return [
    content.slice(0, headLength),
    "\n\n/* ... content omitted for brevity ... */\n\n",
    content.slice(-tailLength),
  ].join("");
};

export const parseFiles = async (files, repoPath = "") => {
  const parsedFiles = [];

  for (const file of files) {
    try {
      const content = await fs.readFile(file, "utf-8");
      const relativePath = repoPath ? path.relative(repoPath, file) : file;

      parsedFiles.push({
        path: relativePath.split(path.sep).join("/"),
        name: path.basename(file),
        extension: path.extname(file),
        size: content.length,
        content: buildExcerpt(content),
      });
    } catch (error) {
      console.log("Error reading file:", file);
    }
  }

  return parsedFiles;
};
