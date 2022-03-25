const path = require('path')
const fs = require('fs')
const { getXmlWidgets } = require('./xml')
const { widgetSafeName } = require('./utils')

/**
 * Reads file structure of "verint" folder and gets widgets with their paths and metadata for
 * future work
 * @param projectTypeName
 * @returns {*[]}
 */
exports.getProjectInfo = function getProjectInfo (projectTypeName = 'defaultwidgets') {
  const verintDir = path.join('verint', 'filestorage')
  const widgetsRoot = path.join(verintDir, projectTypeName)

  if (!fs.existsSync(widgetsRoot)) return []

  //temp: so far we only know how to deal with "defaultwidgets"
  if (projectTypeName !== 'defaultwidgets') return []

  // managing providers
  const providersRootContents = fs.readdirSync(widgetsRoot)

  const providerIdsList = providersRootContents.filter(entryName => {
    return fs.lstatSync(path.join(widgetsRoot, entryName)).isDirectory()
  })

  if (providerIdsList.length > 1) {
    throw new Error('We don\'t have build scripts for more than 1 provider in a project')
  }

  // reading widgets
  const widgetDirPath = path.join(widgetsRoot, providerIdsList[0])
  const widgetDirContents = fs.readdirSync(widgetDirPath)

  const widgetXMLs = widgetDirContents.filter(fileName => fileName.match(/^[a-f\d]{32}\.xml$/i))

  return widgetXMLs.map(xmlFileName => {
    const [mainSection]  = getXmlWidgets(path.join(widgetDirPath, xmlFileName))

    return (!mainSection) ? null : {
      folderInstanceId: xmlFileName.replace(/.xml/i, ''),
      xmlFileName,
      widgetsFolder: widgetDirPath,
      xmlMeta: mainSection._attributes,
      requiredContext: mainSection.requiredContext || null,
      safeName: widgetSafeName(mainSection._attributes.name)
    }
  }).filter(widget => !!widget)
}