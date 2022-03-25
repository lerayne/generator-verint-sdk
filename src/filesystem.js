const fs = require('fs')
const path = require('path')

async function ifCreateDir(path) {
  if (!fs.existsSync(path)) {
    return fs.promises.mkdir(path)
  }
  return null
}

function ifCreatePath(basePath, inputPath) {
  const pathElements = inputPath.split(path.sep)

  let currentPath = basePath
  pathElements.forEach(folderName => {
    currentPath = path.join(currentPath, folderName)
    if(!fs.existsSync(currentPath)){
      fs.mkdirSync(currentPath)
    }
  })

  return currentPath
}

module.exports = {
  ifCreateDir,
  ifCreatePath
}