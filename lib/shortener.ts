import getMeta from "lets-get-meta";
import * as moment from "moment";

import cache from "./cache";
import { fetchEntries } from "./google";
import { LinkRecord } from "./types";

export const refreshCache = async () => {
  const rows = await fetchEntries();

  // Persist list of regex entries to cache
  const regexEntries = rows.filter(r => r.isRegex);
  const regexEntriesPromise = cache.setRegexEntries(regexEntries);

  // Persist metadata of regular links to cache
  const regularEntriesPromise = rows
    .filter(r => !r.isRegex)
    .map(persistRecordWithMetadata);

  return Promise.all([regexEntriesPromise, ...regularEntriesPromise]);
};

// Only need to compute these once per invocation
const currentYYMMDD = moment().format("YYMMDD");

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

    await cache.setEntry(record.from, richRedirect);
  } catch (ex) {
    const fallbackRedirect = `
      <html><head>
      <meta http-equiv="refresh" content="0;${destination}"/>
      </head></html>
    `;
    await cache.setEntry(record.from, fallbackRedirect);
  }
};

export const resourceNotFoundResponse = () =>
  app.config.fallbackUrl
    ? new Response("Redirecting...", {
        status: 302,
        headers: {
          Location: app.config.fallbackUrl
        }
      })
    : new Response("The specified route could not be found", {
        status: 404
      });

export const lookupPath = async (path: string) => {
  // Look for exact match
  const matchingEntry = await cache.getEntry(path);
  if (matchingEntry) {
    // Short-lived cache to prevent duplicate updates for links that were not present
    if (matchingEntry === "404") {
      return resourceNotFoundResponse();
    }
    return new Response(matchingEntry, {
      status: 200,
      headers: { "content-type": "text/html" }
    });
  }

  // Look for regex match
  const regexEntries = await cache.getRegexEntries();
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
