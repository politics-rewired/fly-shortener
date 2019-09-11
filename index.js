import Url from "url-parse";
import queryString from "query-string";
import getMeta from "lets-get-meta";
import cache from "@fly/cache";
import moment from "moment";

// Main handler
fly.http.respondWith(async request => {
  const url = new Url(request.url);
  const params = queryString.parse(url.query);

  if (
    url.pathname.includes("/update") &&
    params.secret == app.config.adminSecret
  ) {
    const result = await clear();
    return new Response("OK", { status: 200 });
  } else if (
    url.pathname.includes("/clear") &&
    params.secret == app.config.adminSecret
  ) {
    const result = await clear();
    return new Response("OK", { status: 200 });
  }

  return route(url.pathname);
});

function normalize(string) {
  return string.toLowerCase().trim();
}

// Route the user
async function route(path) {
  let entries = await cache.getString("entries");
  let regexEntries = await cache.getString("regex-entries");

  let didUpdate = false;

  if (!entries || !regexEntries) {
    const updateResult = await update();
    entries = updateResult.entries;
    regexEntries = updateResult.regexEntries;
  } else {
    entries = JSON.parse(entries);
    regexEntries = JSON.parse(regexEntries);
  }

  const normalizedPath = normalize(path);

  for (const [pattern, replacement] of regexEntries) {
    if (normalizedPath.match(pattern)) {
      let destination = normalizedPath.replace(
        new RegExp(pattern, "g"),
        replacement
      );

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

  for (const entry of entries) {
    const normalizedEntry = normalize(entry);
    if (normalizedPath === normalizedEntry) {
      const html = await cache.getString(entry);

      if (didUpdate) {
        return new Response(html.replace("<head>", '<head updated="true">'), {
          status: 200
        });
      } else {
        return new Response(html, {
          status: 200,
          headers: { "content-type": "text/html" }
        });
      }
    }
  }
}

// Clear all previous data
async function clear() {
  await cache.global.del("entries");
}

async function fetchAll(acc = [], offset) {
  let url = `https://api.airtable.com/v0/${app.config.airtableBase}/Shortlinks`;

  if (offset) {
    url += `?offset=${offset}`;
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${app.config.airtableApiKey}`
    }
  }).then(response => response.json());

  const records = acc.concat(response.records);
  if (response.offset) {
    return await fetchAll(records, response.offset);
  } else {
    return records;
  }
}

// Update routes
async function update() {
  const entries = [];
  const regexEntries = [];

  const records = await fetchAll();

  const isRegexRecord = r => r.fields.Regex;

  const regularRecords = records.filter(r => !isRegexRecord(r));
  const regexRecords = records.filter(r => isRegexRecord(r));

  await Promise.all(regularRecords.map(persistRecordWithMetadata));

  for (let record of regularRecords) {
    entries.push(record.fields.From);
  }

  for (let record of regexRecords) {
    regexEntries.push([record.fields.From, record.fields.To]);
  }

  await cache.set("entries", JSON.stringify(entries));
  await cache.set("regex-entries", JSON.stringify(regexEntries));
  return { entries, regexEntries };
}

const opts = { ttl: 86400 };
async function persistRecordWithMetadata(r) {
  /* Try to fetch metadata and join it with the refresh redirect in the cache */
  try {
    const currentYYMMDD = moment().format("YYMMDD");
    destination = r.fields.To.replace(/YYMMDD/g, currentYYMMDD);

    const html = await fetch(r.fields.To).then(response => response.text());

    const metas = getMeta(html);
    metas.refresh = destination;

    const resultString = `
      <html><head>
      ${Object.entries(metas)
        .map(([key, value]) =>
          key === "refresh"
            ? `<meta http-equiv="${key}" content="0;${value}" />`
            : `<meta name="${key}" content="${value}" />`
        )
        .join("\n")}
      </head></html>
    `;

    await cache.set(r.fields.From, resultString, opts);
  } catch (ex) {
    /* Fallback to just meta refresh redirect */
    await cache.set(
      r.fields.From,
      `<html><head>
        <meta http-equiv="refresh" content="0;${r.fields.To}"/>
      </head></html>`,
      opts
    );
  }
}
