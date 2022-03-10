const fs = require('fs')
const { xml2js } = require('xml-js')

function getXMLContents (filePath) {
  const xmlFile = fs.readFileSync(filePath, { encoding: 'utf8' })
  return xml2js(xmlFile, { compact: true })
}

function getXmlMainSections (filePath) {
  const xmlFileContents = getXMLContents(filePath)

  if (
    xmlFileContents
    && xmlFileContents.scriptedContentFragments
    && xmlFileContents.scriptedContentFragments.scriptedContentFragment
  ) {
    const mainSection = xmlFileContents.scriptedContentFragments.scriptedContentFragment

    return Array.isArray(mainSection) ? mainSection : [mainSection]
  }

  return []
}

module.exports = {
  getXMLContents,
  getXmlMainSections
}
