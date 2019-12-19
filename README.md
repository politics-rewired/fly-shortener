# fly-shortener

A very simple url shortener based on fly.io, with request logging

## Getting Started

### Create Service Account

[Enable the Sheets API](https://developers.google.com/sheets/api/quickstart/nodejs#step_1_turn_on_the) on your Google Cloud Platform project.

Create a service account on Google Cloud and download the JSON credentials. This will contain the service account email as well as the private key needed below.

### Create Google Sheets Doc

It should have one sheet with the following columns in order:

1. **Name** -- The name of the link
1. **From** -- The URL path on the shortener
    - ex. `/sat-event`
1. **To** -- The destination URL. This supports using a special `YYMMDD` sequence that will be replaced with the current date (useful for tracking campaigns)
    - ex. `https://alongdomain.com/path/to/url?source=twitter-YYMMDD`
1. **Is Regex** -- boolean column (`TRUE` or `FALSE`) indicating whether the link record does regex matching
    - ex. From: `/event/(.*)$` To: `https://eventplatform.com/event/$1`

Grant read access on the document to the service account email address.

Copy the document ID from the URL.

### Install `fly`

See [installation docs](https://fly.io/docs/apps/#installation) for platform-specific instructions.

### Configure Secrets

Clone this repo and create a local secrets file

```yaml
# .fly.secrets.yaml
adminSecret: SomethingSecret
fallbackUrl: https://mydomain.com/default-path
googleSheetDocId: XXXXXXXXXX-XXX-XXXXXXXXXXXXXXXXXXXXXXXXXXXXX
googleServiceAccountEmail: [service-account]@[project-id].iam.gserviceaccount.com
googleServiceAccountKey: "-----BEGIN PRIVATE KEY-----\nYourServiceAccountPrivateKey\n-----END PRIVATE KEY-----\n"
```

### Run `fly`

```sh
fly server
```
