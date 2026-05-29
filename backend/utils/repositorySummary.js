import path from "path";

const ENTRYPOINT_PATTERNS = [
  "main.",
  "index.",
  "app.",
  "server.",
  "program.",
  "startup.",
];

const toPosix = (value) => value.split(path.sep).join("/");

export const toRelativeRepoPath = (repoPath, filePath) =>
  toPosix(path.relative(repoPath, filePath));

const buildTreeNode = () => ({
  files: [],
  directories: new Map(),
});

const insertIntoTree = (root, relativePath) => {
  const parts = relativePath.split("/");
  let cursor = root;

  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index];
    const isFile = index === parts.length - 1;

    if (isFile) {
      cursor.files.push(part);
      return;
    }

    if (!cursor.directories.has(part)) {
      cursor.directories.set(part, buildTreeNode());
    }

    cursor = cursor.directories.get(part);
  }
};

const formatTree = (
  node,
  depth = 0,
  maxDepth = 3,
  maxEntriesPerDirectory = 8,
  prefix = "",
) => {
  const lines = [];

  const directoryEntries = [...node.directories.entries()].sort((a, b) =>
    a[0].localeCompare(b[0]),
  );
  const fileEntries = [...node.files].sort((a, b) => a.localeCompare(b));
  const combinedEntries = [
    ...directoryEntries.map(([name, child]) => ({ type: "dir", name, child })),
    ...fileEntries.map((name) => ({ type: "file", name })),
  ];

  const visibleEntries = combinedEntries.slice(0, maxEntriesPerDirectory);

  for (const entry of visibleEntries) {
    if (entry.type === "dir") {
      lines.push(`${prefix}${entry.name}/`);

      if (depth + 1 < maxDepth) {
        lines.push(
          ...formatTree(
            entry.child,
            depth + 1,
            maxDepth,
            maxEntriesPerDirectory,
            `${prefix}  `,
          ),
        );
      }
    } else {
      lines.push(`${prefix}${entry.name}`);
    }
  }

  if (combinedEntries.length > visibleEntries.length) {
    lines.push(`${prefix}... (${combinedEntries.length - visibleEntries.length} more)`);
  }

  return lines;
};

export const buildRepositorySummary = (repoPath, files) => {
  const relativePaths = files.map((file) => toRelativeRepoPath(repoPath, file));
  const extensionCounts = new Map();
  const topLevelCounts = new Map();
  const directoryCounts = new Map();
  const entryPoints = [];
  const root = buildTreeNode();

  for (const relativePath of relativePaths) {
    insertIntoTree(root, relativePath);

    const extension = path.extname(relativePath) || "[no extension]";
    extensionCounts.set(extension, (extensionCounts.get(extension) || 0) + 1);

    const [topLevel = relativePath] = relativePath.split("/");
    topLevelCounts.set(topLevel, (topLevelCounts.get(topLevel) || 0) + 1);

    const segments = relativePath.split("/");
    const directoryPath = segments.slice(0, -1).join("/") || ".";
    directoryCounts.set(directoryPath, (directoryCounts.get(directoryPath) || 0) + 1);

    const fileName = path.basename(relativePath).toLowerCase();
    if (ENTRYPOINT_PATTERNS.some((pattern) => fileName.includes(pattern))) {
      entryPoints.push(relativePath);
    }
  }

  const topLevelStructure = [...topLevelCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => `${name} (${count} files)`);

  const notableDirectories = [...directoryCounts.entries()]
    .filter(([directory]) => directory !== ".")
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([directory, count]) => `${directory} (${count} files)`);

  const languageSignals = [...extensionCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([extension, count]) => `${extension}: ${count}`);

  return {
    totalFiles: relativePaths.length,
    topLevelStructure,
    notableDirectories,
    languageSignals,
    entryPoints: entryPoints.slice(0, 10),
    folderTree: formatTree(root).join("\n"),
    relativePaths,
  };
};
