const { KJUR, KEYUTIL } = require("jsrsasign");

import cache, { normalize } from "./cache";
import { LinkRecord } from "./types";

const SERVICE_ENDPOINT = "https://sheets.googleapis.com";

export const createAuthJwt = () => {
  const header = JSON.stringify({ alg: "RS256", typ: "JWT" });
  const payload = JSON.stringify({
    iss: app.config.googleServiceAccountEmail,
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
    aud: "https://oauth2.googleapis.com/token",
    nbf: Math.floor(Date.now() / 1000),
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 5 * 60
  });

  const rawPrivateKey = app.config.googleServiceAccountKey;
  const unescapedPrivateKey = rawPrivateKey.replace(/\\n/g, "\n");
  const privateKey = KEYUTIL.getKey(unescapedPrivateKey);
  return KJUR.jws.JWS.sign("RS256", header, payload, privateKey);
};

export const getAccessToken = async () => {
  const cachedAccessToken = await cache.getGoogleAccessToken();
  if (cachedAccessToken) return cachedAccessToken;

  const token = createAuthJwt();
  const payload = {
    grant_type: encodeURI("urn:ietf:params:oauth:grant-type:jwt-bearer"),
    assertion: token
  };
  const auth = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  const { access_token } = await auth.json();
  await cache.setGoogleAccessToken(access_token);
  return access_token;
};

export const fetchEntries = async (isRetry = false): Promise<LinkRecord[]> => {
  const accessToken = await getAccessToken();

  const docId = app.config.googleSheetDocId;
  const a1Range = encodeURI(app.config.googleSheetRange);
  const url = `${SERVICE_ENDPOINT}/v4/spreadsheets/${docId}/values/${a1Range}?access_token=${accessToken}`;
  const response = await fetch(url);

  if (!response.ok) {
    if (!isRetry) {
      await cache.clearGoogle();
      return fetchEntries(true);
    }

    throw new Error(
      `Could not fetch sheet entries: [${response.status}] ${response.statusText}`
    );
  }

  const { values: rows }: { values: string[] } = await response.json();

  // Make sure that record has From and To values
  return rows
    .map(row => ({
      from: normalize(row[0]),
      to: row[1],
      isRegex: row[2] === "TRUE"
    }))
    .filter(({ from, to }) => !!from && !!to);
};
