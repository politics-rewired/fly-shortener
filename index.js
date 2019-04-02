import Url from "url-parse";
import queryString from "query-string";
import getMeta from "lets-get-meta";
import cache from "@fly/cache";

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
  let didUpdate = false;

  if (entries) {
    entries = JSON.parse(entries);
  } else {
    didUpdate = true;
    entries = await update();
  }

  const normalizedPath = normalize(path);
  for (let entry of entries) {
    const normalizedEntry = normalize(entry);
    if (normalizedPath === normalizedEntry) {
      const html = await cache.getString(entry);

      if (didUpdate) {
        return new Response(html.replace("<head>", '<head updated="true">'), {
          status: 200
        });
      } else {
        return new Response(html, { status: 200 });
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

  const records = await fetchAll();

  await Promise.all(records.map(persistRecordWithMetadata));

  for (let record of records) {
    entries.push(record.fields.From);
  }

  await cache.set("entries", JSON.stringify(entries));
  return entries;
}

const opts = { ttl: 86400 };
async function persistRecordWithMetadata(r) {
  /* Try to fetch metadata and join it with the refresh redirect in the cache */
  try {
    const html = await fetch(r.fields.To).then(response => response.text());

    const metas = getMeta(html);
    metas.refresh = r.fields.To;

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
    console.log(`Could not fetch metadata for ${r.fields.To}`);
    cache.set(
      r.fields.From,
      `<html><head>
        <meta http-equiv="refresh" content="0;${r.fields.To}"/>
      </head></html>`,
      opts
    );
  }
}
