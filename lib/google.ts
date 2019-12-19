import * as jwt from "jwt-simple";

const SERVICE_ENDPOINT = "https://sheets.googleapis.com";

// We only care about From, To, and Is Regex
const A1_RANGE = "B2:D";

export type LinkRecord = { from: string; to: string; isRegex: boolean };

export const createAuthJwt = () => {
  const claims = {
    iss: app.config.googleServiceAccountEmail,
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp: Math.floor(Date.now() / 1000) + 5 * 60,
    iat: Math.floor(Date.now() / 1000)
  };

  return jwt.encode(claims, app.config.googleServiceAccountKey, "RS256");
};

export const getAccessToken = async () => {
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
  return access_token;
};

export const fetchEntries = async (): Promise<LinkRecord[]> => {
  const accessToken = await getAccessToken();

  const docId = app.config.googleSheetDocId;
  const url = `${SERVICE_ENDPOINT}/v4/spreadsheets/${docId}/values/${A1_RANGE}?access_token=${accessToken}`;
  const response = await fetch(url);
  const { values: rows }: { values: string[] } = await response.json();

  // Make sure that record has From and To values
  return rows
    .map(row => ({
      from: row[0],
      to: row[1],
      isRegex: row[2] === "TRUE"
    }))
    .filter(({ from, to }) => !!from && !!to);
};
