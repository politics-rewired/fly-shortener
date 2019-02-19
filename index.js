import Url from "url-parse";
import queryString from "query-string";
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
    console.log(entry)
    console.log(regex)
    if (path.match(regex)) {
      const destination = await cache.getString(entry);
      console.log(destination)
      const destinationUrl = new Url(destination);
      const destinationParams = queryString.parse(destinationUrl.query);
      const nextParams = Object.assign(destinationParams, params);

      destinationUrl.set("query", queryString.stringify(nextParams));

      return new Response("Redirecting", {
        status: 302,
        headers: { Location: destinationUrl.toString() }
      });
    }
  }
}

// Update routes
function update() {
  const entries = [];

  return fetch(
    `https://api.airtable.com/v0/${app.config.airtableBase}/Shortlinks`,
    {
      headers: {
        Authorization: `Bearer ${app.config.airtableApiKey}`
      }
    }
  )
    .then(response => response.json())
    .then(body => {
      body.records.forEach(r => {
        cache.set(r.fields.From, r.fields.To, { ttl: 86400 });
        entries.push(r.fields.From);
      });

      cache.set("entries", JSON.stringify(entries));
      return entries;
    });
}
