const { google } = require("googleapis");
const creds = require('./token.json');
const parser = require('any-date-parser');
const cellref = require('cellref')
// parser.fromString('2020-10-15');

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

async function update(sheetID, date, name){
  if (name == ""){
    let error = new Error();
    error.name = "CustomError";
    error.message = "Invalid name.";
    error.code = 1;
    return error;
  }

  const sheet = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetID,
    range: "Sheet1",
  }).then(res => res.data.values);

  function getDate(date){
    date = parser.fromString(date.toString().slice(0,15));
    return sheet[0].findIndex(el => parser.fromString(el).toString() == date.toString());
  }

  function checkTime(time){
    time = parser.fromString(time.toString().slice(16,21));
    let startTime = parser.fromString(sheet[10]);
    let endTime = parser.fromString(sheet[13]);
    return startTime < time && time < endTime;
  }

  function getName(name){
    return sheet.findIndex(el => el[1]?.toLowerCase() == name.toLowerCase())
  }

  let dateColumn = getDate(date);
  if (!(dateColumn + 1)){
    let error = new Error();
    error.name = "CustomError";
    error.message = "Date not found in spreadsheet.";
    error.code = 2;
    return error;
  }

  let timeCheck = checkTime(date);
  if (!timeCheck){
    let error = new Error();
    error.name = "CustomError";
    error.message = "Not within valid time range.";
    error.code = 3;
    return error;
  }

  let nameRow = getName(name);
  if (!(nameRow + 1)){
    let error = new Error();
    error.name = "CustomError";
    error.message = "Name not found in spreadsheet.";
    error.code = 4;
    return error;
  }

  // console.log(dateColumn)
  // console.log(nameRow)

  cellToMark = cellref.toA1(`R${nameRow + 1}C${dateColumn + 1}`)

  // console.log(cellToMark)

  sheets.spreadsheets.values.batchUpdate({
    "spreadsheetId": sheetID,
    "resource": {
      "valueInputOption": "USER_ENTERED",
      "data": [
        {
          "range": "Sheet1!" + cellToMark,
          "values": [
            ["TRUE"]
          ]
        }
      ],
      "responseValueRenderOption": "UNFORMATTED_VALUE"
    }
  })

  sheets.spreadsheets.batchUpdate({
    spreadsheetId: sheetID,
    requestBody: {
      requests: [
        {
          repeatCell: {
            cell: {
              dataValidation: {
                condition: {
                  type: "BOOLEAN"
                }
              }
            },
            range: {
              sheetId: 0,
              startRowIndex: 1,
              endRowIndex: sheet.findIndex(row => row[1] == undefined),
              startColumnIndex: 2,
              endColumnIndex: sheet[0].length
            },
            fields: "dataValidation"
          }
        }
      ]
    }
  })

  // Confirm name
  // Check if name exists
  // Check allow new
  // Invalid name - enter new?
  // Invalid name - re-enter
  // https://webapps.stackexchange.com/questions/121502/how-to-add-checkboxes-into-cell-using-google-sheets-api-v4

  // console.log(JSON.stringify(sheet, null, 2));
}

const sheetID = "1BR3Ob0W6hmA8RKcdnTtmB85LyXhNmphe6dMtWJZOZEE";
// let currentTime = new Date().toLocaleString('en-US', { timeZone: 'EST' });
const date = new Date();
update(sheetID, date, "Eshaan")