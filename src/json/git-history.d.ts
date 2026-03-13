declare module '*.json' {
  interface GitCommit {
    hash: string;
    fullHash: string;
    date: string;
    message: string;
  }

  type GitHistory = Record<string, GitCommit[]>;

  const gitHistory: GitHistory;
  export default gitHistory;
}
