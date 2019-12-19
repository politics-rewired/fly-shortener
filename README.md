# fly-shortener

A very simple url shortener based on fly.io, with request logging

## Getting Started

[Install fly](https://fly.io/docs/apps/#installation).

Configure secrets:

```yaml
# .fly.secrets.yaml
adminSecret: SomethingSecret
googleSheetDocId: XXXXXXXXXX-XXX-XXXXXXXXXXXXXXXXXXXXXXXXXXXXX
googleServiceAccountEmail: [service-account]@[project-id].iam.gserviceaccount.com
googleServiceAccountKey: "-----BEGIN PRIVATE KEY-----\nYourServiceAccountPrivateKey\n-----END PRIVATE KEY-----\n"
```

Run fly:

```sh
fly server
```
