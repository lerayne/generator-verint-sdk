// eslint-disable-next-line import/no-unused-modules
const path = require('path')
const fs = require('fs')

const { getXmlEmbeddable, createStaticFileObjectPart, writeNewEmbedXML } = require('../xml')
const { ifCreatePath } = require('../filesystem')
const { getProjectInfo } = require('../getProjectInfo')
const packageJson = require('../../package.json')

const { PATH_EMBEDDABLES } = require('../constants/paths')
const { embedStaticFiles } = require('../constants/global')
const { getLastModified, getNewDescription, binaryToBase64 } = require('../utils')

function writeEmbedInternalXML (
  staticsPath,
  providerId,
  embedId
) {
  const internalWidgetXMLFilePath = path.join(PATH_EMBEDDABLES, providerId, `${embedId}.xml`)

  const currentEmbedXml = getXmlEmbeddable(internalWidgetXMLFilePath)

  // initializing future widget XML
  let newWidgetXmlObject = {
    _attributes: {
      ...currentEmbedXml._attributes,
      lastModified: getLastModified(),
      description:  getNewDescription(
        currentEmbedXml._attributes.description,
        packageJson.version
      ),
    },
  }

  const staticsFileList = fs.readdirSync(staticsPath)

  for (const fileName of staticsFileList) {
    const filePartial = createStaticFileObjectPart(
      fileName,
      fs.readFileSync(path.join(staticsPath, fileName), { encoding: 'utf8' })
    )

    newWidgetXmlObject = { ...newWidgetXmlObject, ...filePartial }
  }

  // just in case a widget's config has requiredContext field
  /* if (currentEmbedXml.requiredContext) {
    newWidgetXmlObject.requiredContext = currentEmbedXml.requiredContext
  } */

  return writeNewEmbedXML(newWidgetXmlObject, internalWidgetXMLFilePath)
}


/*
* Builds verint internal XML file that is used in verint file system, replicated in
* ./verint/filestorage/defaultwidgets
* In this option it builds a separate xml file and separate attachments folder for each widget.
*
* If external (import/export) XML with many widgets in one file is needed - it is created
* afterwards using file structure created by this one
* */
exports.buildInternalXml = function buildInternalXml () {
  try {
    // getting all metadata for every widget in the current /verint/filestorage/defaultwidgets
    const EMBEDS = getProjectInfo()

    console.log('EMBEDS', JSON.stringify(EMBEDS))

    // checking access of each widget file
    for (const embeddable of EMBEDS) {
      fs.accessSync(path.join(embeddable.widgetsFolder, embeddable.xmlFileName))
    }

    const xmlFilesToWrite = EMBEDS.map(embed => {
      // read statics files
      const staticsPath = path.join('src', 'statics')
      const providerId = embed.xmlMeta.providerId || '00000000000000000000000000000000'

      // todo: I changed the way how we get current widget XML. Consider other changes to the code
      return writeEmbedInternalXML(staticsPath, providerId, embed.folderInstanceId)
    })

    return Promise.all(xmlFilesToWrite)
  } catch (ex) {
    console.error(ex)
    throw ex
  }
}

function readEmbedToBundle (embedXmlObject, attachmentsPath) {
  // read current xml
  let embedFiles = []

  // collect files base64 data for new XML
  if (fs.existsSync(attachmentsPath)) {
    const filesList = fs.readdirSync(attachmentsPath)

    if (filesList.length) {
      embedFiles = filesList.map(fileName => {
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
  Object.keys(embedXmlObject).forEach(recordName => {
    if (Object.keys(embedStaticFiles).includes(recordName)) {
      staticFiles[recordName] = embedXmlObject[recordName]
    }
  })

  // creating new widget XML object
  const newXMLObject = {
    _attributes: { ...embedXmlObject._attributes, lastModified: getLastModified() },
    ...staticFiles,
    files:       embedFiles.length ? { file: embedFiles } : null,
  }

  /* if (embedXmlObject.requiredContext) {
    newXMLObject.requiredContext = embedXmlObject.requiredContext
  } */

  return newXMLObject
}


/**
 * This script takes Verint internal XML file built by previous script (buildInternalXml) and
 * builds bundled XML based on it
 *
 * @returns {Promise<void>}
 */
exports.buildBundleXml = function buildBundleXml () {
  try {
    // getting all data for every widget in the current config
    const EMBEDS = getProjectInfo()

    console.log('EMBEDS', JSON.stringify(EMBEDS))

    // checking access of each widget file
    for (const embed of EMBEDS) {
      fs.accessSync(path.join(embed.widgetsFolder, embed.xmlFileName))
    }

    // this is template for future XML structure
    const bundleXMLObject = EMBEDS.map(embed => {
      const mainSection = getXmlEmbeddable(path.join(embed.widgetsFolder, embed.xmlFileName))

      return readEmbedToBundle(
        mainSection,
        path.join(embed.widgetsFolder, embed.folderInstanceId)
      )
    })

    // ensure distrib directory
    const distribDir = ifCreatePath('distrib')

    const xmlFileName = `${packageJson.name.toLowerCase().replace(/\s/gumi, '-')}-${packageJson.version}.xml`

    return writeNewEmbedXML(bundleXMLObject, path.join(distribDir, xmlFileName))
  } catch (ex) {
    console.error(ex)
    throw ex
  }
}
