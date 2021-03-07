import getMeta from "lets-get-meta";
import { DateTime } from "luxon";
import promiseRetry from "promise-retry";
import request from "superagent";

import { Cache } from "./cache";
import { LinkRecord, LinkSource } from "./types";

const currentYYMMDD = () => DateTime.now().toFormat("yyMMdd");

export interface LookupPathOptions {
  exactMatch: (matchingEntry: string) => void;
  regexMatch: (destination: string) => void;
  notFound: () => void;
}

export interface ShortenerOptions {
  cache: Cache;
  source: LinkSource;
}

export class Shortener {
  cache: Cache;
  source: LinkSource;

  constructor(config: ShortenerOptions) {
    this.cache = config.cache;
    this.source = config.source;
  }

  /**
   * Create a one-day cache entry for a short link record containing minimal html comprised of the
   * destination URLs metadata, if it can be fetched, and the necessary redirect meta tag.
   *
   * @param record The short link record from the source spreadsheet to persist
   */
  private persistRecordWithMetadata = async (record: LinkRecord) => {
    const destination = record.to.replace(/YYMMDD/g, currentYYMMDD());

    try {
      const html = await request
        .get(record.to)
        .then((response) => response.text);
      const metas = getMeta(html);
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

      await this.cache.setEntry(record.from, richRedirect);
    } catch (ex) {
      const fallbackRedirect = `
        <html><head>
        <meta http-equiv="refresh" content="0;${destination}"/>
        </head></html>
      `;
      await this.cache.setEntry(record.from, fallbackRedirect);
    }
  };

  refreshCache = async (path?: string) => {
    const rows = await this.source.fetchEntries();

    // Persist list of regex entries to cache
    const regexEntries = rows.filter((r) => r.isRegex);
    const regexEntriesPromise = this.cache.setRegexEntries(regexEntries);

    // Persist metadata of regular links to cache
    let regularEntries = rows.filter((r) => !r.isRegex);
    if (path) {
      regularEntries = regularEntries.filter((r) => r.from === path);
    }
    const regularEntriesPromise = regularEntries.map(
      this.persistRecordWithMetadata
    );

    return Promise.all([regexEntriesPromise, ...regularEntriesPromise]);
  };

  lookup = async (path: string, options: LookupPathOptions) =>
    promiseRetry({ retries: 1 }, async (retry, attempt) => {
      // Look for exact match
      const matchingEntry = await this.cache.getEntry(path);
      if (matchingEntry) {
        // Short-lived cache to prevent duplicate updates for links that were not present
        if (matchingEntry === "404") {
          return options.notFound();
        }
        return options.exactMatch(matchingEntry);
      }

      // Look for regex match
      const regexEntries = await this.cache.getRegexEntries();
      for (const [pattern, replacement] of regexEntries) {
        if (path.match(pattern)) {
          let destination = path.replace(new RegExp(pattern, "g"), replacement);

          destination = destination.replace(/YYMMDD/g, currentYYMMDD());

          return options.regexMatch(destination);
        }
      }

      if (attempt === 1) {
        // Refresh the cache for this path if no match
        await this.refreshCache(path);
        return retry("attempt after cache refresh");
      } else {
        await this.cache.set404Entry(path);
        return options.notFound();
      }
    });
}
