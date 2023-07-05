const path = require('path');
const express = require('express')
const app = express()
const port = '80'
app.use(express.json());

app.get(/.*/, async (req, res, next) => {
  return res.sendFile(path.join(__dirname, 'test.html'))
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})