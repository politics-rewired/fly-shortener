import { ResponseError } from 'superagent';

export type LinkRecord = { from: string; to: string; isRegex: boolean };

export interface LinkSource {
  fetchEntries: () => Promise<LinkRecord[]>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any,@typescript-eslint/explicit-module-boundary-types
export const isSuperagentError = (candidate: any): candidate is ResponseError => {
  return candidate.status !== undefined && candidate.response !== undefined;
};
