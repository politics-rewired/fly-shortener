import express from 'express';

import { config, LinkSourceType } from './config';
import { createAdminRouter } from './lib/admin';
import { Cache } from './lib/cache';
import { LinkSource } from './lib/types';
import { GoogleSheetsSource } from './lib/google';
import { Shortener } from './lib/shortener';
import request from 'superagent';

const cache = new Cache(config.redis);
let source: LinkSource;
if (config.source === LinkSourceType.GoogleSheets && config.googleConfig) {
  source = new GoogleSheetsSource(config.googleConfig, cache);
} else {
  throw new Error('Incorrectly configured link source!');
}
const shortener = new Shortener({ cache, source });

const app = express();
const host = '0.0.0.0';
const port = 8080; // default port to listen

app.get('/favicon.ico', (req, res) => {
  res.status(404).send();
});

app.get('/healthz', (req, res) => {
  res.sendStatus(200);
});

type Visit = {
  path: string;
  destination: string;
  query: Record<string, unknown>;
};

const maybeTryLoggingVisit = async (visit: Visit) => {
  if (config.visitTrackingUrl) {
    try {
      await request.post(config.visitTrackingUrl).send(visit);
    } catch (ex) {
      console.error('Error communicating with visit tracker', ex);
    }
  }
};

// define a route handler for the default home page
app.use('/admin', createAdminRouter(cache, shortener));

app.use(async (req, res) => {
  try {
    await shortener.lookup(req.path, {
      exactMatch: (matchingEntry) => {
        maybeTryLoggingVisit({
          path: req.path,
          destination: matchingEntry,
          query: req.query,
        });

        return res
          .header({
            'Cache-Control': 'no-cache',
            'content-type': 'text/html',
          })
          .send(matchingEntry);
      },
      regexMatch: (destination) => {
        maybeTryLoggingVisit({
          path: req.path,
          destination: destination,
          query: req.query,
        });

        return res
          .status(302)
          .header({
            'Cache-Control': 'no-cache',
            Location: destination,
          })
          .send('Redirecting...');
      },
      notFound: () =>
        config.fallbackUrl
          ? res
              .status(302)
              .header({
                'Cache-Control': 'no-cache',
                Location: config.fallbackUrl,
              })
              .send('Redirecting...')
          : res
              .status(404)
              .header({
                'Cache-Control': 'no-cache',
              })
              .send('The specified route could not be found'),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).send('An internal error occured. Please try again later.');
  }
});

// start the Express server
app.listen(port, host, () => {
  console.log(`server started at http://${host}:${port}`);
});
