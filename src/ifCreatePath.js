const fs = require('fs')
const path = require('path')

module.exports = function ifCreatePath(basePath, inputPath) {
  const pathElements = inputPath.split(path.sep)

  let currentPath = basePath
  pathElements.forEach(folderName => {
    currentPath = path.join(currentPath, folderName)
    if(!fs.existsSync(currentPath)){
      fs.mkdirSync(currentPath)
    }
  })
}
