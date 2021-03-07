import { DateTime } from 'luxon';
import Redis from 'ioredis';
import FakeRedis from 'ioredis-mock';

import { LinkRecord } from './types';

const EntryCacheKeys = Object.freeze({
  RegexEntries: 'regex-entries',
  EntryTag: 'entry',
});

const GoogleCacheKeys = Object.freeze({
  AccessToken: 'google:access-token',
});

const TTL_404 = 5 * 60; // Five minutes

// Expire record at the end of the day. Compute every time to prevent caching by Fly
export const secondsToEod = (): number =>
  Math.round(DateTime.now().endOf('day').diffNow('seconds').seconds);

const pathKey = (path: string) => `${EntryCacheKeys.EntryTag}:${path}`;

const regexReducer = (acc: string[][], current: LinkRecord): string[][] =>
  acc.concat([[current.from, current.to]]);

export const normalize = (str: string): string => str.toLowerCase().trim();

export class Cache {
  public client: Redis.Redis;

  constructor(connectionString?: string) {
    this.client = connectionString
      ? new Redis(connectionString === 'redis://localhost' ? undefined : connectionString)
      : new FakeRedis();
  }

  clearEntries = async (): Promise<void> => {
    await this.client.del(EntryCacheKeys.RegexEntries);

    const entryPattern = `${EntryCacheKeys.EntryTag}:*`;
    const stream = this.client.scanStream({ match: entryPattern });
    const delPromises: Promise<number>[] = [];
    stream.on('data', (resultKeys) => {
      delPromises.push(this.client.del(...resultKeys));
    });
    await Promise.all(delPromises);

    // This is an option for atomic deletes but may have a severe performance
    // impact in production. See https://stackoverflow.com/a/16974060
    // const delLuaScript =
    //   "return redis.call('del', unpack(redis.call('keys', ARGV[1])))";
    // await this.client.eval(delLuaScript, 0, entryPattern);
  };

  getEntry = async (path: string): Promise<string | null> => this.client.get(pathKey(path));

  setEntry = async (path: string, content: string, ttl?: number): Promise<'OK' | null> => {
    // Prefix path to avoid collisions with internal cache keys
    const ttlSeconds = ttl ?? secondsToEod();
    return this.client.set(pathKey(path), content, 'EX', ttlSeconds);
  };

  set404Entry = async (path: string): Promise<'OK' | null> => this.setEntry(path, '404', TTL_404);

  getRegexEntries = async (): Promise<string[][]> => {
    const jsonEntries = await this.client.get(EntryCacheKeys.RegexEntries);
    return jsonEntries ? JSON.parse(jsonEntries) : [];
  };

  setRegexEntries = async (entries: LinkRecord[]): Promise<void> => {
    const regexEntries = entries.reduce(regexReducer, []);
    const regexEntry = JSON.stringify(regexEntries);
    await this.client.set(EntryCacheKeys.RegexEntries, regexEntry, 'EX', secondsToEod());
  };

  getGoogleAccessToken = (): Promise<string | null> => this.client.get(GoogleCacheKeys.AccessToken);

  setGoogleAccessToken = (accessToken: string): Promise<'OK' | null> =>
    this.client.set(
      GoogleCacheKeys.AccessToken,
      accessToken,
      'EX',
      // Google access tokens are valid for one hour; store for 55 minutes to be safe
      60 * 55
    );

  delGoogleAccessToken = (): Promise<number> => this.client.del(GoogleCacheKeys.AccessToken);
}
