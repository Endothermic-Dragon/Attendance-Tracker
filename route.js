const path = require('path');
const fs = require('fs');

const express = require('express')
const app = express()
const port = 80
app.use(express.json());
var QRCode = require('qrcode')

const { google } = require("googleapis");
const parser = require('any-date-parser');
const cellref = require('cellref')

// const creds = require('./creds.json')
const dotenv = require('dotenv');
dotenv.config();

const seedrandom = require('seedrandom');

// console.log(process.env.secret)

function newClient(){
  return new google.auth.OAuth2(
    "190836595018-t97kk6shg0u7in2jf86gklffmj6ec6bq.apps.googleusercontent.com",
    process.env.secret || "",
    "http://localhost"
  );
}

const sheets = google.sheets({ version: "v4" });

const sheetIDs = {
  "cs-club": "1BR3Ob0W6hmA8RKcdnTtmB85LyXhNmphe6dMtWJZOZEE",
  "sci-oly": "15K_4CaRx4cMMkbF-yfYDqhP9cobccKu3O8BfLf6gtwA"
}

async function update(sheetID, date, name, hash, oauth){
  if (name == ""){
    return {code: 1, message: "Invalid name."}
  }

  const sheet = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetID,
    range: "Sheet1",
    auth: oauth
  }).then(res => res.data.values);

  function getDate(date){
    date = parser.fromString(date.slice(0,15));
    return sheet[0].findIndex(el => parser.fromString(el).toString() == date.toString());
  }

  function checkTime(time){
    time = parser.fromString(time.slice(16,21));
    let startTime = parser.fromString(sheet[10]);
    let endTime = parser.fromString(sheet[13]);
    return startTime < time && time < endTime;
  }

  function getName(name){
    return sheet.findIndex(el => el[1]?.toLowerCase() == name.toLowerCase())
  }

  let dateColumn = getDate(date);
  if (!(dateColumn + 1)){
    return {code: 2, message: "Date not found in spreadsheet."}
  }

  let timeCheck = checkTime(date);
  if (!timeCheck){
    return {code: 3, message: "Not within valid time range."}
  }

  let nameRow = getName(name);
  if (!(nameRow + 1)){
    return {code: 4, message: "Name not found in spreadsheet.", data: sheet[7][0] == "TRUE"}
  }

  var rng = seedrandom(sheet[0][dateColumn] + sheet[25][0])
  correctHash = ""
  for (let i = 0; i < 8; i++){
    correctHash += String.fromCharCode(97 + Math.floor(rng() * 26))
  }
  // console.log(correctHash)
  if (hash != correctHash){
    return {code: 5, message: "Incorrect code in URL."}
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

  return {code: 0};

  // Confirm name
  // Check if name exists
  // Check allow new
  // Invalid name - enter new?
  // Invalid name - re-enter
  // https://webapps.stackexchange.com/questions/121502/how-to-add-checkboxes-into-cell-using-google-sheets-api-v4

  // console.log(JSON.stringify(sheet, null, 2));
}

app.get(/.*/, async (req, res, next) => {
  try {
    next()
  } catch (e) {
    res.send(e)
  }
})

app.get(/^\/[^\/]+\/get-url-codes$/, async (req, res) => {
  const source = req.url.split("/")[1];
  const sheetID = sheetIDs[source];

  if (!sheetID){
    return res.send("404 Not Found")
  }

  const authData = JSON.parse(fs.readFileSync('tokens.json'));
  let authPackage = authData[source];
  let oauth2Client = newClient()
  oauth2Client.setCredentials(authPackage)

  const sheet = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetID,
    range: "Sheet1",
    auth: oauth2Client
  }).then(res => res.data.values);

  if (sheet[22][0] != req.get("referer").split("/").at(-1)){
    return res.send("401 Unauthorized")
  }

  let dates = sheet[0].slice(2)

  let response = []

  for (let i = 0; i < dates.length; i++){
    let date = dates[i]
    var rng = seedrandom(sheet[0][i+2] + sheet[25][0])
    hash = ""
    for (let i = 0; i < 8; i++){
      hash += String.fromCharCode(97 + Math.floor(rng() * 26))
    }
    
    let url = req.get("referer").split("/").slice(0,4).join("/") + "/" + hash

    let dataURL = await QRCode.toDataURL(url, {errorCorrectionLevel: "Q", width: 600})

    response.push({
      title: date,
      code: hash,
      url: url,
      qrcode: dataURL
    })
  }

  res.send(response)
})

app.get(/^\/[^\/]+\/dashboard$/, (req, res) => {
  return res.sendFile(path.join(__dirname, 'resources/direct.html'))
})

app.get(/^\/[^\/]+\/dashboard\/.*$/, async (req, res) => {
  const source = req.url.split("/")[1];
  const sheetID = sheetIDs[source];

  if (!sheetID){
    return res.send("404 Not Found")
  }
  
  try {
    const authData = JSON.parse(fs.readFileSync('tokens.json'));
    let authPackage = authData[source];
    let oauth2Client = newClient()
    oauth2Client.setCredentials(authPackage)

    const sheet = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetID,
      range: "Sheet1!A23:A23",
      auth: oauth2Client
    }).then(res => res.data.values[0][0]);

    if (sheet == req.originalUrl.split("/").at(-1)){
      return res.sendFile(path.join(__dirname, 'resources/dashboard.html'))
    }

    res.send("401 Unauthorized")
  } catch {
    res.redirect(`/${source}/sign-in`)
  }
})

app.get(/^\/[^\/]+\/sign-in$/, async (req, res) => {
  return res.sendFile(path.join(__dirname, 'resources/sign-in.html'))
})

app.get(/^\/[^\/]+\/.*$/, (req, res) => {
  if (!Object.keys(sheetIDs).includes(req.url.split("/")[1])){
    return res.send("404 Not Found")
  }
  res.sendFile(path.join(__dirname, `resources/${req.url.split("/")[1]}/attendance.html`))
})

app.get("/google-sign-in.js", async (req, res) => {
  res.sendFile(path.join(__dirname, `resources/google-sign-in.js`))
})

app.post(/^\/[^\/]+\/set-credentials/, async (req, res) => {
  if (req.get("X-Requested-With") != "javascript-fetch"){
    // Unauthorized request origin
    return res.status(400).send({})
  }

  if (!req.body.code){
    return res.status(404).send({})
  }

  source = req.originalUrl.split("/")[1];

  // console.log(source);

  const oauth2Client = newClient()
  tokens = await oauth2Client.getToken(req.body.code).then(data => data.tokens);
  // console.log(tokens)
  let currData;
  try {
    currData = JSON.parse(fs.readFileSync('tokens.json'));
  } catch {
    currData = {}
  }
  currData[source] = tokens;
  fs.writeFileSync('tokens.json', JSON.stringify(currData, null, 2));

  res.send({status: true})

  // oauth2Client.setCredentials(tokens);

  // const sheets = google.sheets({ version: "v4" });

  // const sheet = await sheets.spreadsheets.values.get({
  //   spreadsheetId: sheetIDs["cs-club"],
  //   range: "Sheet1!A23:A23",
  //   auth: oauth2Client
  // }).then(res => res.data.values[0][0]);
  // console.log(sheet)
})

app.post(/^\/[^\/]+\/present$/, async (req, res) => {
  const source = req.url.split("/")[1];
  const sheetID = sheetIDs[source];

  if (!sheetID){
    return res.send("404 Not Found")
  }
  try {
    const authData = JSON.parse(fs.readFileSync('tokens.json'));
  } catch {
    return res.send({code: 6})
  }
  let authPackage = authData[source];
  let oauth2Client = newClient()
  oauth2Client.setCredentials(authPackage)

  hash = req.get("referer").split("/").at(-1)


  // console.log(req.body)
  let status = await update(sheetID, req.body.date, req.body.name, hash, oauth2Client)
  res.send(status)
})

app.post(/^\/[^\/]+\/add-name$/, async (req, res) => {
  const source = req.url.split("/")[1];
  const sheetID = sheetIDs[source];

  if (!sheetID){
    return res.send("404 Not Found")
  }
  
  const authData = JSON.parse(fs.readFileSync('tokens.json'));
  let authPackage = authData[source];
  let oauth2Client = newClient()
  oauth2Client.setCredentials(authPackage)

  const sheet = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetID,
    range: "Sheet1",
    auth: oauth2Client
  }).then(res => res.data.values);

  if (sheet[7][0].toLowerCase() == "false"){
    return res.send({code: 1})
  }

  if (sheet[19][0] != req.body.code){
    return res.send({code: 2})
  }

  let endRow = sheet.findIndex(row => row[1] == undefined) + 1;
  // console.log(endRow)

  sheets.spreadsheets.values.append({
    spreadsheetId: sheetID,
    range: `Sheet1!B${endRow}:B${endRow}`,
    resource: {
      range: `Sheet1!B${endRow}:B${endRow}`,
      values: [[req.body.name]]
    },
    valueInputOption: "USER_ENTERED",
    insertDataOption: "OVERWRITE",
    auth: oauth2Client
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
              endRowIndex: endRow,
              startColumnIndex: 2,
              endColumnIndex: sheet[0].length
            },
            fields: "dataValidation"
          }
        }
      ]
    },
    auth: oauth2Client
  })

  res.send({code: 0})
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
