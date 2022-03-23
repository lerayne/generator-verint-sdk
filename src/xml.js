const fs = require('fs')
const { js2xml, xml2js } = require('xml-js')
const { ifCreatePath } = require('./filesystem')
const path = require('path')
const { base64ToBinary } = require('./utils')

function getXMLContents (filePath) {
  const xmlFile = fs.readFileSync(filePath, { encoding: 'utf8' })
  return xml2js(xmlFile, { compact: true })
}

function getXmlWidgets (filePath) {
  const xmlFileContents = getXMLContents(filePath)

  if (
    xmlFileContents
    && xmlFileContents.scriptedContentFragments
    && xmlFileContents.scriptedContentFragments.scriptedContentFragment
  ) {
    const mainSection = xmlFileContents.scriptedContentFragments.scriptedContentFragment

    return Array.isArray(mainSection) ? mainSection : [mainSection]
  }

  return []
}

function getXmlTheme (filePath) {
  const xmlFileContents = getXMLContents(filePath)

  return xmlFileContents.theme
}

/**
 * @param widgetXmlObjects - object or an array of objects
 * @param filePath
 * @returns {Promise<void>}
 */
async function writeNewWidgetXML (widgetXmlObjects, filePath) {
  const widgetObject = {
    scriptedContentFragments: {
      scriptedContentFragment: widgetXmlObjects
    }
  }

  const xml = js2xml(widgetObject, {
    compact: true,
    spaces: 2,
    indentCdata: true,
    indentAttributes: true
  })

  return fs.promises.writeFile(filePath, xml)
}

async function writeNewThemeXML (themeXmlObject, filePath) {
  const xml = js2xml({
    theme: themeXmlObject
  }, {
    compact: true,
    spaces: 2,
    indentCdata: true,
    indentAttributes: true
  })

  return fs.promises.writeFile(filePath, xml)
}

/**
 * given with a file name (eg contentScript.vm) and file contents
 * outputs an object of a form:
 * {
 *   contentScript: {
 *     _cdata: '...', //(file contents)
 *     _attributes: {
 *       language: 'Velocity'
 *     }
 *   }
 * }
 *
 * this object partial is assumed to be mixed into a resulting object by
 * { ...resultingObject, ...partial }
 *
 * @param fileName
 * @param fileContents
 * @returns {{[p: number]: {_cdata: *, _attributes: {language: null}|null}}}
 */
function createStaticFileObjectPart (fileName, fileContents) {
  const [xmlEntryName, fileExtension] = fileName.split('.')

  let language = null
  if (fileExtension.toLowerCase() === 'vm') { language = 'Velocity' }
  if (fileExtension.toLowerCase() === 'js') { language = 'JavaScript' }

  return {
    [xmlEntryName]: {
      _attributes: language ? { 'language': language } : null,
      _cdata: fileContents
    }
  }
}

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
    //write attachment files
    const recordData = xmlObject[recordName]

    if (recordName === fieldName && recordData.file) {
      //single entry is not parsed as array, so we make it an array
      if (recordData.file.length === undefined) recordData.file = [recordData.file]

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

module.exports = {
  getXMLContents,
  getXmlTheme,
  getXmlWidgets,
  writeNewWidgetXML,
  writeNewThemeXML,
  createStaticFileObjectPart,
  getFileExtension,
  writeAttachments
}