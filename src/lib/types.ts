export type LinkRecord = { from: string; to: string; isRegex: boolean };

export interface LinkSource {
  fetchEntries: () => Promise<LinkRecord[]>;
}
