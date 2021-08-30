// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config();

import { cleanEnv, CleanedEnvAccessors, str, url, email, makeValidator } from 'envalid';

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

interface Config extends CleanedEnvAccessors {
  adminSecret: string;
  fallbackUrl: string;
  timezone: string;
  redisUrl?: string;
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
  FLY_REDIS_CACHE_URL: str({ default: undefined }),
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

export const config: Config = {
  ...envConfig,
  adminSecret: env.ADMIN_SECRET,
  fallbackUrl: env.FALLBACK_URL,
  timezone: env.TIMEZONE,
  redisUrl: env.FLY_REDIS_CACHE_URL,
  source: env.SOURCE,
  googleConfig,
  airtableConfig,
};
