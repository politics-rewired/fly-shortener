import cache from "@fly/cache";
import getMeta from "lets-get-meta";
import * as moment from "moment";

import { fetchEntries, LinkRecord } from "./google";

export const REGEX_CACHE = "regex-entries";
export const CACHE_TAG = "entry";
export const TTL_404 = 5 * 60;

export const clearCache = async () => {
  await cache.global.del(REGEX_CACHE);
  await cache.global.purgeTag(CACHE_TAG);
};

const regexReducer = (acc: string[][], current: LinkRecord): string[][] => {
  return acc.concat([[current.from, current.to]]);
};

export const refreshCache = async () => {
  const rows = await fetchEntries();

  // Persist list of regex entries to cache
  const regexEntries = rows.filter(r => r.isRegex).reduce(regexReducer, []);
  const regexEntry = JSON.stringify(regexEntries);
  const regexEntriesPromise: Promise<void> = cache.set(REGEX_CACHE, regexEntry);

  // Persist metadata of regular links to cache
  const regularEntriesPromise = rows
    .filter(r => !r.isRegex)
    .map(persistRecordWithMetadata);

  return Promise.all([regexEntriesPromise, ...regularEntriesPromise]);
};

// Only need to compute these once per invocation
const currentYYMMDD = moment().format("YYMMDD");

// Expire record at the end of the day
const cacheTtl = moment()
  .endOf("day")
  .diff(moment(), "seconds");
const cacheOpts = { ttl: cacheTtl, tags: [CACHE_TAG] };

/**
 * Create a one-day cache entry for a short link record containing minimal html comprised of the
 * destination URLs metadata, if it can be fetched, and the necessary redirect meta tag.
 *
 * @param record The short link record from the source spreadsheet to persist
 */
const persistRecordWithMetadata = async (record: LinkRecord) => {
  const destination = record.to.replace(/YYMMDD/g, currentYYMMDD);

  try {
    const html = await fetch(record.to).then(response => response.text());
    const metas: { [key: string]: string } = getMeta(html);
    metas.refresh = destination;

    const metaDoms = Object.entries(metas).map(([key, value]) =>
      key === "refresh"
        ? `<meta http-equiv="${key}" content="0;${value}" />`
        : `<meta name="${key}" content="${value}" />`
    );
    const richRedirect = `
      <html><head>
      ${metaDoms.join("\n")}
      </head></html>
    `;

    await cache.set(record.from, richRedirect, cacheOpts);
  } catch (ex) {
    const fallbackRedirect = `
      <html><head>
      <meta http-equiv="refresh" content="0;${destination}"/>
      </head></html>
    `;
    await cache.set(record.from, fallbackRedirect, cacheOpts);
  }
};

export const lookupPath = async (path: string) => {
  // Look for exact match
  const matchingEntry = await cache.getString(path);
  if (matchingEntry) {
    // Short-lived cache to prevent duplicate updates for links that were not present
    if (matchingEntry === "404") {
      return new Response("", { status: 404 });
    }
    return new Response(matchingEntry, {
      status: 200,
      headers: { "content-type": "text/html" }
    });
  }

  // Look for regex match
  let regexEntries = await cache.getString(REGEX_CACHE);
  regexEntries = regexEntries ? JSON.parse(regexEntries) : [];
  for (const [pattern, replacement] of regexEntries) {
    if (path.match(pattern)) {
      let destination = path.replace(new RegExp(pattern, "g"), replacement);

      const currentYYMMDD = moment().format("YYMMDD");
      destination = destination.replace(/YYMMDD/g, currentYYMMDD);

      return new Response("Redirecting...", {
        status: 302,
        headers: {
          Location: destination
        }
      });
    }
  }
};
