declare module '../json/git-history.json' {
  export interface GitCommit {
    hash: string;
    fullHash: string;
    date: string;
    message: string;
  }

  export type GitHistory = Record<string, GitCommit[]>;

  const gitHistory: GitHistory;
  export default gitHistory;
}
