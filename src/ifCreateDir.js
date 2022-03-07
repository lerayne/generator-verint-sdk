const fs = require('fs')

async function ifCreateDir(path) {
  if (!fs.existsSync(path)) {
    return fs.promises.mkdir(path)
  }
  return null
}

module.exports = ifCreateDir