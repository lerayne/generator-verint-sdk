const fs = require('fs')
const path = require('path')
const { ifCreatePath } = require('./filesystem')
const { base64ToBinary } = require('./utils')
const { js2xml } = require('xml-js')

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

function writePageLayouts (themeXmlObject, themeLayoutsPath) {
  if (themeXmlObject.pageLayouts) {

    const layoutsXml = {
      theme: {
        _attributes: { name: themeXmlObject._attributes.id },
        defaultHeaders: themeXmlObject.pageLayouts.headers,
        defaultFooters: themeXmlObject.pageLayouts.footers,
        defaultFragmentPages: themeXmlObject.pageLayouts.pages
      }
    }

    fs.writeFileSync(
      path.join(themeLayoutsPath, themeXmlObject._attributes.themeTypeId + '.xml'),
      js2xml(layoutsXml, {
        compact: true,
        spaces: 2,
        indentCdata: true,
        indentAttributes: true,
        attributeValueFn: value => value.replace(/&(?!amp;)/gui, '&amp;')
      })
    )

    /*fs.writeFileSync(
      path.join(themeLayoutsPath, themeXmlObject._attributes.themeTypeId + '.json'),
      JSON.stringify(layoutsXml, null, 2)
    )*/
  }
}

module.exports = {
  writeAttachments,
  writeStatics,
  writeThemePreview,
  writePageLayouts
}