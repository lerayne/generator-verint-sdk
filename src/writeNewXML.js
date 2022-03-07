const fs = require('fs')
const { js2xml } = require('xml-js')

async function writeNewXML (scriptedContentFragment, filePath) {
  const widgetObject = {
    scriptedContentFragments: {
      scriptedContentFragment
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

module.exports = writeNewXML