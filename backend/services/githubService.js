import simpleGit from "simple-git";

import fs from "fs-extra";

import path from "path";

export const cloneRepository = async (repoUrl) => {
  const repoName = Date.now().toString();

  const repoPath = path.join("temp", repoName);

  await fs.ensureDir("temp");

  const git = simpleGit();

  await git.clone(repoUrl, repoPath);

  return repoPath;
};
