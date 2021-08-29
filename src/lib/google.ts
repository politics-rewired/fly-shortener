// eslint-disable-next-line @typescript-eslint/no-var-requires
const { KJUR, KEYUTIL } = require('jsrsasign');
import promiseRetry from 'promise-retry';
import request from 'superagent';

import { Cache, normalize } from './cache';
import { GoogleConfig } from '../config';
import { isSuperagentError, LinkRecord, LinkSource } from './types';

const SERVICE_ENDPOINT = 'https://sheets.googleapis.com';

export class GoogleSheetsSource implements LinkSource {
  private config: GoogleConfig;
  private cache: Cache;

  constructor(config: GoogleConfig, cache: Cache) {
    this.config = config;
    this.cache = cache;
  }

  private createAuthJwt = (): Promise<string> => {
    const header = JSON.stringify({ alg: 'RS256', typ: 'JWT' });
    const payload = JSON.stringify({
      iss: this.config.serviceAccountEmail,
      scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
      aud: 'https://oauth2.googleapis.com/token',
      nbf: Math.floor(Date.now() / 1000),
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 5 * 60,
    });

    const rawPrivateKey = this.config.serviceAccountKey;
    const unescapedPrivateKey = rawPrivateKey.replace(/\\n/g, '\n');
    const privateKey = KEYUTIL.getKey(unescapedPrivateKey);
    return KJUR.jws.JWS.sign('RS256', header, payload, privateKey);
  };

  private getAccessToken = async (): Promise<string> => {
    const cachedAccessToken = await this.cache.getGoogleAccessToken();
    if (cachedAccessToken) return cachedAccessToken;

    const token = this.createAuthJwt();
    const payload = {
      grant_type: encodeURI('urn:ietf:params:oauth:grant-type:jwt-bearer'),
      assertion: token,
    };
    const auth = await request.post('https://oauth2.googleapis.com/token').send(payload);
    const { access_token } = await auth.body;
    await this.cache.setGoogleAccessToken(access_token);
    return access_token;
  };

  fetchEntries = (): Promise<LinkRecord[]> =>
    promiseRetry({ retries: 1 }, async (retry, attempt) => {
      const accessToken = await this.getAccessToken();

      const docId = this.config.sheetDocId;
      const a1Range = encodeURI(this.config.sheetRange);
      const url = `${SERVICE_ENDPOINT}/v4/spreadsheets/${docId}/values/${a1Range}?access_token=${accessToken}`;

      try {
        const response = await request.get(url);
        const { values: rows }: { values: string[] } = response.body;

        // Make sure that record has From and To values
        const entries: LinkRecord[] = rows
          .map((row) => ({
            from: normalize(row[0]),
            to: row[1],
            isRegex: row[2] === 'TRUE',
          }))
          .filter(({ from, to }) => !!from && !!to);

        return entries;
      } catch (err) {
        if (isSuperagentError(err)) {
          const isAuthErr = err.status === 401 || err.status === 403;
          if (attempt === 1 && isAuthErr) {
            await this.cache.delGoogleAccessToken();
            return retry(new Error('expired access token'));
          } else {
            console.error(err);
            const { status = 'unknown', response: { body } = { body: 'unknown' } } = err;
            throw new Error(`Could not fetch sheet entries: [${status}] ${body}`);
          }
        }
        console.error(err);
        throw new Error(`Encountered unexpected error: ${err}`);
      }
    });
}
