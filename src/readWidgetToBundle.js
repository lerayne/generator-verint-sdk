const fs = require('fs')
const path = require('path')

const { getLastModified, binaryToBase64 } = require('./utils')
const { widgetStaticFiles } = require('./constants/global')

exports.readWidgetToBundle = function readWidgetToBundle (widgetConfig, attachmentsPath) {
  // read current xml
  let widgetFiles = []

  // collect files base64 data for new XML
  if (fs.existsSync(attachmentsPath)) {
    const filesList = fs.readdirSync(attachmentsPath)

    if (filesList.length) {
      widgetFiles = filesList.map(fileName => {
        const fileContents = fs.readFileSync(path.join(attachmentsPath, fileName))

        return {
          _attributes: { name: fileName },
          _text:       binaryToBase64(fileContents),
        }
      })
    }
  }

  // copy static files directly from original XML
  const staticFiles = {}
  Object.keys(widgetConfig).forEach(recordName => {
    if (Object.keys(widgetStaticFiles).includes(recordName)) {
      staticFiles[recordName] = widgetConfig[recordName]
    }
  })

  // creating new widget XML object
  const newXMLObject = {
    _attributes: { ...widgetConfig._attributes, lastModified: getLastModified() },
    ...staticFiles,
    files:       widgetFiles.length ? { file: widgetFiles } : null,
  }

  if (widgetConfig.requiredContext) {
    newXMLObject.requiredContext = widgetConfig.requiredContext
  }

  return newXMLObject
}
