import cache from "@fly/cache";
import * as moment from "moment";

import { LinkRecord } from "./types";

const CacheKeys = Object.freeze({
  RegexEntries: "regex-entries",
  EntryTag: "entry"
});

const TTL_404 = 5 * 60;

// Expire record at the end of the day. Only need to compute these once per invocation
const cacheTtl = moment()
  .endOf("day")
  .diff(moment(), "seconds");
const cacheOpts = { ttl: cacheTtl, tags: [CacheKeys.EntryTag] };

const regexReducer = (acc: string[][], current: LinkRecord): string[][] =>
  acc.concat([[current.from, current.to]]);

const clear = async () => {
  await cache.global.del(CacheKeys.RegexEntries);
  await cache.global.purgeTag(CacheKeys.EntryTag);
};

const getEntry = async (path: string) =>
  cache.getString(`${CacheKeys.EntryTag}:${path}`);

const setEntry = async (path: string, content: string, ttl?: number) => {
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
  return cache.set(CacheKeys.RegexEntries, regexEntry, { ttl: cacheTtl });
};

export default {
  clear,
  getEntry,
  setEntry,
  set404Entry,
  getRegexEntries,
  setRegexEntries
};
