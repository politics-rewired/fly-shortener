// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config();

import { cleanEnv, CleanedEnvAccessors, str, url, email, makeValidator, port, num } from 'envalid';

export enum LinkSourceType {
  GoogleSheets = 'google-sheets',
  Airtable = 'airtable',
}

export interface GoogleConfig {
  sheetDocId: string;
  sheetRange: string;
  serviceAccountEmail: string;
  serviceAccountKey: string;
}

export interface AirtableConfig {
  apiKey: string;
  base: string;
}

export interface RedisBlockConfig {
  port: number;
  family: number;
  host: string;
  username: string;
  password: string;
}

export type RedisConfig = string | RedisBlockConfig;

interface Config extends CleanedEnvAccessors {
  adminSecret: string;
  fallbackUrl: string;
  timezone: string;
  redis: RedisConfig;
  source: LinkSourceType;
  googleConfig?: GoogleConfig;
  airtableConfig?: AirtableConfig;
}

const linkSource = makeValidator<LinkSourceType>((input) => {
  switch (input) {
    case LinkSourceType.Airtable:
      return LinkSourceType.Airtable;
    case LinkSourceType.GoogleSheets:
      return LinkSourceType.GoogleSheets;
    default:
      throw new Error(`Unknown LinkSourceType: ${input}`);
  }
});

const env = cleanEnv(process.env, {
  ADMIN_SECRET: str({}),
  FALLBACK_URL: url({}),
  REDIS_URL: str({ default: undefined }),
  REDIS_PORT: port({ default: 6379 }),
  REDIS_FAMILY: num({ devDefault: 4, default: 6 }),
  REDIS_HOST: str({ default: undefined }),
  REDIS_USERNAME: str({ devDefault: undefined, default: 'default' }),
  REDIS_PASSWORD: str({ default: undefined }),
  TIMEZONE: str({}),
  SOURCE: linkSource({
    choices: Object.values(LinkSourceType),
    default: LinkSourceType.GoogleSheets,
  }),
  GOOGLE_SHEET_DOC_ID: str({ default: undefined }),
  GOOGLE_SHEET_RANGE: str({ default: undefined }),
  GOOGLE_SERVICE_ACCOUNT_EMAIL: email({ default: undefined }),
  GOOGLE_SERVICE_ACCOUNT_KEY: str({ default: undefined }),
  AIRTABLE_API_KEY: str({ default: undefined }),
  AIRTABLE_BASE: str({ default: undefined }),
});

const googleConfig: GoogleConfig | undefined =
  (env.GOOGLE_SHEET_DOC_ID &&
    env.GOOGLE_SHEET_RANGE &&
    env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    env.GOOGLE_SERVICE_ACCOUNT_KEY && {
      sheetDocId: env.GOOGLE_SHEET_DOC_ID,
      sheetRange: env.GOOGLE_SHEET_RANGE,
      serviceAccountEmail: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      serviceAccountKey: env.GOOGLE_SERVICE_ACCOUNT_KEY,
    }) ||
  undefined;

const airtableConfig: AirtableConfig | undefined =
  (env.AIRTABLE_API_KEY &&
    env.AIRTABLE_BASE && {
      apiKey: env.AIRTABLE_API_KEY,
      base: env.AIRTABLE_BASE,
    }) ||
  undefined;

const envConfig = {
  isDev: env.isDev,
  isDevelopment: env.isDevelopment,
  isProd: env.isProduction,
  isProduction: env.isProduction,
  isTest: env.isTest,
};

const redis: RedisConfig = env.REDIS_URL
  ? env.REDIS_URL
  : {
      port: env.REDIS_PORT,
      family: env.REDIS_FAMILY,
      host: env.REDIS_HOST,
      username: env.REDIS_USERNAME,
      password: env.REDIS_PASSWORD,
    };

export const config: Config = {
  ...envConfig,
  adminSecret: env.ADMIN_SECRET,
  fallbackUrl: env.FALLBACK_URL,
  timezone: env.TIMEZONE,
  redis,
  source: env.SOURCE,
  googleConfig,
  airtableConfig,
};
