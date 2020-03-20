import cache from "@fly/cache";
import * as moment from "moment";

import { LinkRecord } from "./types";

const CacheKeys = Object.freeze({
  GoogleAccessToken: "token-key",
  RegexEntries: "regex-entries",
  EntryTag: "entry"
});

const TTL_404 = 5 * 60;

// Expire record at the end of the day. Compute every time to prevent caching by Fly
const eodTtl = () =>
  moment()
    .endOf("day")
    .diff(moment(), "seconds");

const eodCacheOpts = () => ({ ttl: eodTtl(), tags: [CacheKeys.EntryTag] });

const regexReducer = (acc: string[][], current: LinkRecord): string[][] =>
  acc.concat([[current.from, current.to]]);

const clearGoogle = async () => cache.global.del(CacheKeys.GoogleAccessToken);

const getGoogleAccessToken = async (): Promise<string> =>
  cache.getString(CacheKeys.GoogleAccessToken);

// Google access tokens are valid for one hour; store for 55 minutes to be safe
const setGoogleAccessToken = async (accessToken: string): Promise<string> =>
  cache.set(CacheKeys.GoogleAccessToken, accessToken, { ttl: 60 * 55 });

const clearEntries = async () => {
  await cache.global.del(CacheKeys.RegexEntries);
  await cache.global.purgeTag(CacheKeys.EntryTag);
};

const getEntry = async (path: string) =>
  cache.getString(`${CacheKeys.EntryTag}:${path}`);

const setEntry = async (path: string, content: string, ttl?: number) => {
  const cacheOpts = eodCacheOpts();
  const options = ttl ? Object.assign(cacheOpts, { ttl }) : cacheOpts;
  // Prefix path to avoid collisions with internal cache keys
  return cache.set(`${CacheKeys.EntryTag}:${path}`, content, options);
};

const set404Entry = async (path: string) => setEntry(path, "404", TTL_404);

const getRegexEntries = async (): Promise<string[][]> => {
  const jsonEntries = await cache.getString(CacheKeys.RegexEntries);
  return jsonEntries ? JSON.parse(jsonEntries) : [];
};

const setRegexEntries = async (entries: LinkRecord[]) => {
  const regexEntries = entries.reduce(regexReducer, []);
  const regexEntry = JSON.stringify(regexEntries);
  return cache.set(CacheKeys.RegexEntries, regexEntry, { ttl: eodTtl() });
};

export const normalize = (str: string) => str.toLowerCase().trim();

export default {
  clearGoogle,
  getGoogleAccessToken,
  setGoogleAccessToken,
  clearEntries,
  getEntry,
  setEntry,
  set404Entry,
  getRegexEntries,
  setRegexEntries
};
