const path = require('path')
const fs = require('fs')

const { PATH_WIDGETS } = require('./constants/paths')
const packageJson = require('../package.json')
const { getLastModified, getNewDescription } = require('./utils')
const { writeNewWidgetXML, createStaticFileObjectPart, getXmlWidgets } = require('./xml')

exports.writeWidgetInternalXML = function writeWidgetInternalXML (
  staticsPath,
  providerId,
  widgetId
) {
  const internalWidgetXMLFilePath = path.join(PATH_WIDGETS, providerId, `${widgetId}.xml`)

  const [currentWidgetXml] = getXmlWidgets(internalWidgetXMLFilePath)

  // initializing future widget XML
  let newWidgetXmlObject = {
    _attributes: {
      ...currentWidgetXml._attributes,
      lastModified: getLastModified(),
      description:  getNewDescription(
        currentWidgetXml._attributes.description,
        packageJson.version
      ),
    },
  }

  //const staticFilesDir = path.join(staticsPath, providerId, widgetId)
  const staticsFileList = fs.readdirSync(staticsPath)

  for (const fileName of staticsFileList) {
    const filePartial = createStaticFileObjectPart(
      fileName,
      fs.readFileSync(path.join(staticsPath, fileName), { encoding: 'utf8' })
    )

    newWidgetXmlObject = { ...newWidgetXmlObject, ...filePartial }
  }

  // just in case a widget's config has requiredContext field
  if (currentWidgetXml.requiredContext) {
    newWidgetXmlObject.requiredContext = currentWidgetXml.requiredContext
  }

  return writeNewWidgetXML(newWidgetXmlObject, internalWidgetXMLFilePath)
}
