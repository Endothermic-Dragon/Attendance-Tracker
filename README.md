# How to Set Up
1. Run `npm i` to install necessary packages
2. Go to [Google API Console](https://console.cloud.google.com/apis/dashboard) and set up credentials
3. Put the downloaded JSONc in the same directory as this file
4. Rename the JSON file to `credentials.json`
5. Run `complete-auth.js`
   1. This will generate `token.json`
6. Write the rest of your spreadsheet-related code in `main.js`