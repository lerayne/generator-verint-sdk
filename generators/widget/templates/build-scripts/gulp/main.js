const path = require('path')
const fs = require('fs')
const moment = require('moment')

const writeNewXML = require('../writeNewXML')
const ifCreateDir = require('../ifCreateDir')
const { textToBase64 } = require('../base64')
const { getXMLContents } = require('../importXML')
const { getProjectInfo } = require('../getProjectInfo')
const createStaticFileObjectPart = require('../createStaticFileObjectPart')
const getLastModified = require('../getLastModified')

const manifest = require('../../package.json')


/*
* Builds verint internal XML file that is used in verint file system, replicated in
* ./verint/filestorage/defaultwidgets
* In this option it builds a separate xml file and separate attachments folder for each widget.
*
* If external (import/export) XML with many widgets in one file is needed - it is created
* afterwards using file structure created by this one
* */
exports.buildInternalXml = async function buildInternalXml () {
  try {
    //getting all metadata for every widget in the current /verint/filestorage/defaultwidgets
    const WIDGETS = getProjectInfo('defaultwidgets')

    console.log('WIDGETS', JSON.stringify(WIDGETS))

    //checking access of each widget file
    WIDGETS.forEach(widget => {
      fs.accessSync(path.join(widget.widgetsFolder, widget.xmlFileName))
    })

    const xmlFilesToWrite = WIDGETS.map(widget => {
      //read statics files
      const staticsPath = path.join('src', widget.safeName, 'statics')
      const staticsFileList = fs.readdirSync(staticsPath)

      // initializing future widget XML
      let widgetXmlObject = {
        _attributes: { ...widget.xmlMeta, lastModified: getLastModified() },
      }

      // read statics from src/{widgetName}/statics and put them into the object
      staticsFileList.forEach(fileName => {
        const filePartial = createStaticFileObjectPart(
          fileName,
          fs.readFileSync(path.join(staticsPath, fileName), { encoding: 'utf8' })
        )

        widgetXmlObject = { ...widgetXmlObject, ...filePartial }
      })

      // just in case a widget's config has requiredContext field
      if (widget.requiredContext) widgetXmlObject.requiredContext = widget.requiredContext

      //create promise to return an array of promises
      return writeNewXML(widgetXmlObject, path.join(widget.widgetsFolder, widget.xmlFileName))
    })

    return Promise.all(xmlFilesToWrite)
  } catch (err) {
    console.error(err)
  }
}

/**
 * This script takes Verint internal XML file built by previous script (buildInternalXml) and
 * builds bundled XML based on it
 *
 * @returns {Promise<void>}
 */
exports.buildBundleXml = async function buildBundleXml () {
  try {
    //getting all data for every widget in the current config
    const WIDGETS = getProjectInfo('defaultwidgets')

    console.log('WIDGETS', JSON.stringify(WIDGETS))

    //checking access of each widget file
    for (let i = 0; i < WIDGETS.length; i++) {
      const widget = WIDGETS[i]
      await fs.promises.access(path.join(widget.widgetsFolder, widget.xmlFileName))
    }

    //this is template for future XML structure
    const bundleXMLObject = []

    //for each widget
    for (let i = 0; i < WIDGETS.length; i++) {
      const widget = WIDGETS[i]

      //read current xml
      const xmlFile = getXMLContents(path.join(widget.widgetsFolder, widget.xmlFileName))

      const attachmentsPath = path.join(widget.widgetsFolder, widget.folderInstanceId)
      const widgetFiles = []

      //collect files base64 data for new XML
      if (fs.existsSync(attachmentsPath)) {
        const filesList = await fs.promises.readdir(attachmentsPath)

        if (filesList.length) {
          for (let j = 0; j < filesList.length; j++) {
            const fileName = filesList[j]

            //if it's not image - read it as utf8
            const options = {}
            if (!fileName.match(/.(png|jpg|jpeg|gif)$/i)) { options.encoding = 'utf8' }

            const fileContents = await fs.promises.readFile(path.join(attachmentsPath, fileName), options)

            widgetFiles.push({
              _attributes: { name: fileName },
              _text: textToBase64(fileContents)
            })
          }
        }
      }

      //copy static files directly from original XML
      const staticFiles = {}
      const mainSection = xmlFile.scriptedContentFragments.scriptedContentFragment
      Object.keys(mainSection).forEach(recordName => {
        const recordData = mainSection[recordName]
        if (recordName !== '_attributes' && recordName !== 'files' && recordName !== 'requiredContext') {
          staticFiles[recordName] = recordData
        }
      })

      const newXMLObject = {
        _attributes: {
          ...widget.xmlMeta,
          lastModified: moment().format('YYYY-MM-DD H:mm:ss') + 'Z'
        },
        ...staticFiles,
        files: widgetFiles.length ? { file: widgetFiles } : null
      }

      if (mainSection.requiredContext) {
        newXMLObject.requiredContext = mainSection.requiredContext
      }

      bundleXMLObject.push(newXMLObject)
    }

    // ensure distrib directory
    const distribDir = path.join('distrib')
    await ifCreateDir(distribDir)

    const xmlFileName = `${manifest.name.toLowerCase().replace(/\s/gmi, '-')}-${manifest.version}.xml`

    return writeNewXML(bundleXMLObject, path.join(distribDir, xmlFileName))
  } catch (err) {
    console.error(err)
  }
}