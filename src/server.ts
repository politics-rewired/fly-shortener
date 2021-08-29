import express from 'express';

import { config, LinkSourceType } from './config';
import { createAdminRouter } from './lib/admin';
import { Cache } from './lib/cache';
import { LinkSource } from './lib/types';
import { GoogleSheetsSource } from './lib/google';
import { Shortener } from './lib/shortener';

const cache = new Cache(config.redisUrl);
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

// define a route handler for the default home page
app.use('/admin', createAdminRouter(cache, shortener));

app.use(async (req, res) => {
  try {
    await shortener.lookup(req.path, {
      exactMatch: (matchingEntry) =>
        res
          .header({
            'Cache-Control': 'no-cache',
            'content-type': 'text/html',
          })
          .send(matchingEntry),
      regexMatch: (destination) =>
        res
          .status(302)
          .header({
            'Cache-Control': 'no-cache',
            Location: destination,
          })
          .send('Redirecting...'),
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
