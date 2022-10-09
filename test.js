const seedrandom = require('seedrandom');

var rng = seedrandom('Oct 9, 2022 + ')

var rng = seedrandom("Oct 9, 2022" + "abc")
correctHash = ""
for (let i = 0; i < 8; i++){
  correctHash += String.fromCharCode(97 + Math.floor(rng() * 26))
}

console.log(correctHash)