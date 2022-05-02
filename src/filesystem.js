// eslint-disable-next-line import/no-unused-modules
const fs = require('fs')
const path = require('path')

function ifCreatePath (basePath, inputPath = '') {
  let currentPath = basePath
  for (const folderName of inputPath.split(path.sep)) {
    currentPath = path.join(currentPath, folderName)
    if (!fs.existsSync(currentPath)) fs.mkdirSync(currentPath)
  }

  return currentPath
}

module.exports = {
  ifCreatePath,
}
