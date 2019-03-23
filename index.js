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
    const result = await update();
    return new Response(result.join("\n"), { status: 200 });
  }

  return route(url.pathname, params);
});

// Route the user
async function route(path, params) {
  let entries = await cache.getString("entries");
  if (entries) entries = JSON.parse(entries);
  else entries = await update();

  for (let entry of entries) {
    const regex = new RegExp(entry, "i");
    if (path.match(regex)) {
      const html = await cache.getString(entry);
      return new Response(html, { status: 200 });
    }
  }
}

// Update routes
async function update() {
  const entries = [];

  const { records } = await fetch(
    `https://api.airtable.com/v0/${app.config.airtableBase}/Shortlinks`,
    {
      headers: {
        Authorization: `Bearer ${app.config.airtableApiKey}`
      }
    }
  ).then(response => response.json());

  await Promise.all(records.map(persistRecordWithMetadata));

  for (let record of records) {
    entries.push(record.fields.From);
  }

  cache.global.del("entries");
  cache.set("entries", JSON.stringify(entries));
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
            : `<meta name="${key}" content="0;${value}" />`
        )
        .join("\n")}
      </head></html>
    `;

    cache.set(r.fields.From, resultString, opts);
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
