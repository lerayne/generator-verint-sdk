const path = require('path')
const fs = require('fs')
const { getXMLContents } = require('./importXML')
const widgetSafeName = require('./widgetSafeName')

/**
 * Reads file structure of "verint" folder and gets widgets with their paths and metadata for
 * future work
 * @param projectTypeName
 * @returns {*[]}
 */
exports.getProjectInfo = function getProjectInfo (projectTypeName = 'defaultwidgets') {
  const verintDir = path.join('verint', 'filestorage')
  if (fs.existsSync(verintDir)) {
    if (projectTypeName === 'defaultwidgets') {
      const projectsRoot = path.join(verintDir, 'defaultwidgets')
      if (fs.existsSync(projectsRoot)) {

        const rootFolderContents = fs.readdirSync(projectsRoot)

        const providerIdsList = rootFolderContents.filter(entryName => {
          return fs.lstatSync(path.join(projectsRoot, entryName)).isDirectory()
        })

        if (providerIdsList.length > 1) {
          throw new Error('We don\'t have build scripts for more than 1 provider in a project')
        }

        const widgetFiles = fs.readdirSync(path.join(projectsRoot, providerIdsList[0]))
        const widgetXMLs = widgetFiles.filter(fileName => fileName.match(/^[a-f\d]{32}.xml$/i))
        const widgets = []

        for (let i = 0; i < widgetXMLs.length; i++) {
          const xmlFileName = widgetXMLs[i]
          const xmlFilePath = path.join(projectsRoot, providerIdsList[0], xmlFileName)
          const instanceId = xmlFileName.replace(/.xml/i, '')
          const json = getXMLContents(xmlFilePath)

          const mainSection = json.scriptedContentFragments && json.scriptedContentFragments.scriptedContentFragment

          if (mainSection) {
            widgets.push({
              folderInstanceId: instanceId,
              xmlFileName,
              widgetsFolder: path.join(projectsRoot, providerIdsList[0]),
              xmlMeta: mainSection._attributes,
              requiredContext: mainSection.requiredContext || null,
              safeName: widgetSafeName(mainSection._attributes.name)
            })
          }
        }

        return widgets
      }
      return []
    }
    return []
  }
  return []
}