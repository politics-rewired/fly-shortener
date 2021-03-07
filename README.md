# fly-shortener

A very simple url shortener based on fly.io, with request logging

## Getting Started

### Create Service Account

[Enable the Sheets API](https://developers.google.com/sheets/api/quickstart/nodejs#step_1_turn_on_the) on your Google Cloud Platform project.

Create a service account on Google Cloud and download the JSON credentials. This will contain the service account email as well as the private key needed below.

### Create Google Sheets Doc

It should have one sheet with the following columns in order. There can be other columns, these three just need to be next to each other in this order.

1. **From** -- The URL path on the shortener
   - ex. `/sat-event`
1. **To** -- The destination URL. This supports using a special `YYMMDD` sequence that will be replaced with the current date (useful for tracking campaigns)
   - ex. `https://alongdomain.com/path/to/url?source=twitter-YYMMDD`
1. **Is Regex** -- boolean column (`TRUE` or `FALSE`) indicating whether the link record does regex matching
   - ex. From: `/event/(.*)$` To: `https://eventplatform.com/event/$1`

Grant read access on the document to the service account email address.

Copy the document ID from the URL.

Copy the range of the short links in [A1 notation](https://developers.google.com/sheets/api/guides/concepts#a1_notation).

### Install `fly`

See [installation docs](https://fly.io/docs/getting-started/installing-flyctl/) for platform-specific instructions.

### Create Fly Configuration

```sh
cp fly.toml.example fly.prod.toml
vi fly.prod.toml
```

### Configure Secrets

Set application environment variables via [Fly Secrets](https://fly.io/docs/reference/secrets/):

```sh
cp .env.example .env.prod
vi .env.prod

awk '!/^#/ && NF' .env.prod | xargs -p flyctl secrets set --config fly.prod.toml
```

### Run `fly`

```sh
flyctl deploy --config fly.prod.toml
```
