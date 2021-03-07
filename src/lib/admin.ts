import express from 'express';

import { config } from '../config';
import { Cache } from './cache';
import { Shortener } from './shortener';

const adminAuth: express.RequestHandler = (req, res, next) => {
  if (req.query.secret !== config.adminSecret) {
    return res.status(403).send('Unauthorized');
  }
  return next();
};

export const createAdminRouter = (cache: Cache, shortener: Shortener): express.Router => {
  const router = express.Router();

  router.use(adminAuth);

  router.get('/clear', async (req, res) => {
    await cache.delGoogleAccessToken();
    await cache.clearEntries();
    return res.send('Cleared');
  });

  router.get('/refresh', async (req, res) => {
    await cache.clearEntries();
    await shortener.refreshCache();
    return res.send('Refreshed');
  });

  return router;
};
