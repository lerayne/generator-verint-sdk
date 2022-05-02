// eslint-disable-next-line import/no-unused-modules
const path = require('path')
const fs = require('fs')

const { getXmlEmbeddable } = require('./xml')
const { widgetSafeName } = require('./utils')
const { PATH_EMBEDDABLES } = require('./constants/paths')

/**
 * Reads file structure of "verint" folder and gets widgets with their paths and metadata for
 * future work
 * @param projectTypeName
 * @returns {*[]}
 */
exports.getProjectInfo = function getProjectInfo () {
  if (!fs.existsSync(PATH_EMBEDDABLES)) return []

  // managing providers
  const providersRootContents = fs.readdirSync(PATH_EMBEDDABLES)

  const providerIdsList = providersRootContents.filter(entryName => (
    fs.lstatSync(path.join(PATH_EMBEDDABLES, entryName)).isDirectory()
  ))

  if (providerIdsList.length > 1) {
    throw new Error('We don\'t have build scripts for more than 1 provider in a project')
  }

  // reading widgets
  const embedDirPath = path.join(PATH_EMBEDDABLES, providerIdsList[0])
  const embedDirContents = fs.readdirSync(embedDirPath)

  const embedXMLs = embedDirContents.filter(fileName => fileName.match(/^[a-f\d]{32}\.xml$/iu))

  return embedXMLs.map(xmlFileName => {
    const mainSection  = getXmlEmbeddable(path.join(embedDirPath, xmlFileName))

    return (!mainSection)
      ? null
      : {
        folderInstanceId: xmlFileName.replace(/.xml/iu, ''),
        xmlFileName,
        widgetsFolder:    embedDirPath,
        xmlMeta:          mainSection._attributes,
        safeName:         widgetSafeName(mainSection._attributes.name),
      }
  }).filter(embed => !!embed)
}
