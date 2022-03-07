const fs = require('fs')
const { xml2js } = require('xml-js')

function getXMLContents (filePath) {
  const xmlFile = fs.readFileSync(filePath, { encoding: 'utf8' })
  return xml2js(xmlFile, { compact: true })
}

exports.getXMLContents = getXMLContents