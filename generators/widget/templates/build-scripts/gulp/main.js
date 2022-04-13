// eslint-disable-next-line import/no-unused-modules
const path = require('path')
const fs = require('fs')

const { writeNewWidgetXML, getXmlWidgets } = require('../xml')
const { ifCreatePath } = require('../filesystem')
const { getLastModified, binaryToBase64 } = require('../utils')
const { getProjectInfo } = require('../getProjectInfo')
const { writeWidgetInternalXML } = require('../writeWidgetInternalXML')
const packageJson = require('../../package.json')

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
    const WIDGETS = getProjectInfo('defaultwidgets')

    console.log('WIDGETS', JSON.stringify(WIDGETS))

    // checking access of each widget file
    for (const widget of WIDGETS) {
      fs.accessSync(path.join(widget.widgetsFolder, widget.xmlFileName))
    }

    const xmlFilesToWrite = WIDGETS.map(widget => {
      // read statics files
      const staticsPath = path.join('src', widget.safeName, 'statics')
      const widgetProviderId = widget.xmlMeta.providerId || '00000000000000000000000000000000'

      // todo: I changed the way how we get current widget XML. Consider other changes to the code
      return writeWidgetInternalXML(staticsPath, widgetProviderId, widget.folderInstanceId)
    })

    return Promise.all(xmlFilesToWrite)
  } catch (ex) {
    console.error(ex)
    throw ex
  }
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
    const WIDGETS = getProjectInfo('defaultwidgets')

    console.log('WIDGETS', JSON.stringify(WIDGETS))

    // checking access of each widget file
    for (const widget of WIDGETS) {
      fs.accessSync(path.join(widget.widgetsFolder, widget.xmlFileName))
    }

    // this is template for future XML structure
    const bundleXMLObject = WIDGETS.map(widget => {
      // read current xml
      const [mainSection] = getXmlWidgets(path.join(widget.widgetsFolder, widget.xmlFileName))
      const attachmentsPath = path.join(widget.widgetsFolder, widget.folderInstanceId)
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
      Object.keys(mainSection).forEach(recordName => {
        if (!['_attributes', 'files', 'requiredContext'].includes(recordName)) {
          staticFiles[recordName] = mainSection[recordName]
        }
      })

      // creating new widget XML object
      const newXMLObject = {
        _attributes: { ...widget.xmlMeta, lastModified: getLastModified() },
        ...staticFiles,
        files:       widgetFiles.length ? { file: widgetFiles } : null,
      }

      if (mainSection.requiredContext) {
        newXMLObject.requiredContext = mainSection.requiredContext
      }

      return newXMLObject
    })

    // ensure distrib directory
    const distribDir = ifCreatePath('distrib')

    const xmlFileName = `${packageJson.name.toLowerCase().replace(/\s/gumi, '-')}-${packageJson.version}.xml`

    return writeNewWidgetXML(bundleXMLObject, path.join(distribDir, xmlFileName))
  } catch (ex) {
    console.error(ex)
    throw ex
  }
}
