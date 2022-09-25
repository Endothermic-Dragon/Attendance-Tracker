const { google } = require("googleapis");
const creds = require('./token.json')

const auth = new google.auth.OAuth2(
  creds.client_id,
  creds.client_secret,
  "urn:ietf:wg:oauth:2.0:oob"
);

auth.setCredentials({
  refresh_token: creds.refresh_token,
  token_type: "Bearer"
});

const sheets = google.sheets({ version: "v4", auth });

async function wrapper(){
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: "1uDYOfe-CRozUX-pz5UupuNgkKv0p0ZtYfL7dps3j0fM",
    range: "Sheet1",
  });

  console.log(JSON.stringify(res.data, null, 2));
}

wrapper()