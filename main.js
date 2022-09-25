const { google } = require("googleapis");
const creds = require('./token.json')

const auth = new google.auth.OAuth2(
  creds.client_id,
  creds.client_secret,
  "urn:ietf:wg:oauth:2.0:oob"
);

auth.setCredentials({
  access_token: "DUMMY",
  expiry_date: 1,
  refresh_token: creds.refresh_token,
  token_type: "Bearer",
});

const sheets = google.sheets({ version: "v4", auth });

async function wrapper(){
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: "1t1oIvoknE9fye4LAd2ZYzfIYlu49r5Jf6XbwNKt1saE",
    range: "Sheet1!A1:E",
  });

  console.log(JSON.stringify(res.data, null, 2));
}

wrapper()