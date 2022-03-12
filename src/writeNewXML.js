const fs = require('fs')
const { js2xml } = require('xml-js')

/**
 * @param widgetXmlObjects - object or an array of objects
 * @param filePath
 * @returns {Promise<void>}
 */
module.exports = async function writeNewXML (widgetXmlObjects, filePath) {
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
