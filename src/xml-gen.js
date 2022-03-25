const fs = require('fs')
const path = require('path')
const { ifCreatePath } = require('./filesystem')
const { base64ToBinary } = require('./utils')

function getFileExtension (fileRecord, defaultExt = '') {
  const extensionMapping = {
    'Velocity': '.vm',
    'JavaScript': '.js'
  }

  if (
    fileRecord._attributes
    && fileRecord._attributes.language
    && extensionMapping[fileRecord._attributes.language]
  ) {
    return extensionMapping[fileRecord._attributes.language]
  }

  return defaultExt
}

function writeAttachments (xmlObject, fieldName, destinationPath, destinationSubPath = '') {
  for (const recordName of Object.keys(xmlObject)) {
    const recordData = xmlObject[recordName]

    if (recordName === fieldName && recordData.file) {
      //single entry is not parsed as array, so we make it an array
      if (typeof recordData.file.length === 'undefined') recordData.file = [recordData.file]

      for (const file of recordData.file) {
        if (destinationSubPath) {
          ifCreatePath(destinationPath, destinationSubPath)
        }
        fs.writeFileSync(
          path.join(destinationPath, destinationSubPath, file._attributes.name),
          base64ToBinary(file._cdata || file._text || '')
        )
      }
    }
  }
}

function writeStatics (xmlObject, staticsPath, staticFilesList = {}) {
  for (const [recordName, recordData] of Object.entries(xmlObject)) {
    if (Object.keys(staticFilesList).includes(recordName)) {
      let fileName
      if (recordData._attributes && recordData._attributes.language) {
        fileName = recordName + getFileExtension(recordData, '.xml')
      } else {
        fileName = staticFilesList[recordName]
      }

      fs.writeFileSync(
        path.join(staticsPath, fileName),
        recordData._cdata
          ? recordData._cdata.trim()
          : (recordData._text ? recordData._text.trim() : '')
      )
    }
  }
}

function writeThemePreview (themeXmlObject, themeFilesPath) {
  if (themeXmlObject.previewImage) {
    const previewPath = ifCreatePath(themeFilesPath, 'preview')
    fs.writeFileSync(
      path.join(previewPath, themeXmlObject.previewImage._attributes.name),
      base64ToBinary(themeXmlObject.previewImage._cdata)
    )
  }
}

module.exports = {
  writeAttachments,
  writeStatics,
  writeThemePreview
}