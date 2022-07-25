// eslint-disable-next-line import/no-unused-modules
const fs = require('fs')

const { js2xml, xml2js } = require('xml-js')

function getXMLContents (filePath) {
  const xmlFile = fs.readFileSync(filePath, { encoding: 'utf8' })
  return xml2js(xmlFile, { compact: true })
}

function getXmlWidgets (filePath) {
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

function getXmlTheme (filePath) {
  const xmlFileContents = getXMLContents(filePath)

  return xmlFileContents.theme
}

function getXmlEmbeddable (filePath) {
  const xmlFileContents = getXMLContents(filePath)

  return xmlFileContents.embeddable
}

/**
 * @param widgetXmlObjects - object or an array of objects
 * @param filePath
 * @returns {Promise<void>}
 */
function writeNewWidgetXML (widgetXmlObjects, filePath) {
  const widgetObject = {
    scriptedContentFragments: {
      scriptedContentFragment: widgetXmlObjects,
    },
  }

  const xml = js2xml(widgetObject, {
    compact:          true,
    // eslint-disable-next-line no-magic-numbers
    spaces:           2,
    indentCdata:      true,
    indentAttributes: true,
  })

  return fs.promises.writeFile(filePath, xml)
}

function writeNewThemeXML (themeXmlObject, filePath) {
  const xml = js2xml({
    theme: themeXmlObject,
  }, {
    compact:          true,
    // eslint-disable-next-line no-magic-numbers
    spaces:           2,
    indentCdata:      true,
    indentAttributes: true,
    attributeValueFn: (value, _name, parent) => {
      let newValue = value
        .replace(/&(?!#?[a-zA-Z0-9]+;)/gui, '&amp;')
        .replace(/</gui, '&lt;')
        .replace(/>/gui, '&gt;')
        .replace(/"/gui, '&quot;')

      if (parent === 'scopedProperty') {
        newValue = newValue
          .replace(/\r/gui, '&#xD;')
          .replace(/\n/gui, '&#xA;')
      }

      return newValue
    },
  })

  return fs.promises.writeFile(filePath, xml)
}

function writeNewEmbedXML (embedXmlObject, filePath) {
  const xml = js2xml({
    embeddable: embedXmlObject,
  }, {
    compact:          true,
    // eslint-disable-next-line no-magic-numbers
    spaces:           2,
    indentCdata:      true,
    indentAttributes: true,
  })

  return fs.promises.writeFile(filePath, xml)
}

/**
 * given with a file name (eg contentScript.vm) and file contents
 * outputs an object of a form:
 * {
 *   contentScript: {
 *     _cdata: '...', //(file contents)
 *     _attributes: {
 *       language: 'Velocity'
 *     }
 *   }
 * }
 *
 * this object partial is assumed to be mixed into a resulting object by
 * { ...resultingObject, ...partial }
 *
 * @param fileName
 * @param fileContents
 * @returns {{[p: number]: {_cdata: *, _attributes: {language: null}|null}}}
 */
function createStaticFileObjectPart (fileName, fileContents) {
  const [xmlEntryName, fileExtension] = fileName.split('.')

  let language = null
  if (fileExtension.toLowerCase() === 'vm') { language = 'Velocity' }
  if (fileExtension.toLowerCase() === 'js') { language = 'JavaScript' }

  return {
    [xmlEntryName]: {
      _attributes: language ? { language } : null,
      _cdata:      fileContents,
    },
  }
}

module.exports = {
  getXmlTheme,
  getXmlWidgets,
  getXmlEmbeddable,
  writeNewWidgetXML,
  writeNewThemeXML,
  writeNewEmbedXML,
  createStaticFileObjectPart,
}
