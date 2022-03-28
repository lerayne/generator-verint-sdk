const path = require('path')
const fs = require('fs')
const getThemesProjectInfo = require('../getThemesProjectInfo')
const { getLastModified, objectReverse, binaryToBase64, widgetSafeName } = require('../utils')
const { themeStaticFiles, themeTypeIds, themeTypeFolders } = require('../constants/global')
const { PATH_THEME_DEFINITIONS, PATH_THEME_FILES_FD } = require('../constants/paths')
const { writeNewThemeXML, getXmlTheme } = require('../xml')
const { ifCreatePath } = require('../filesystem')

/**
 * 1) Read theme configs from verint/filestorage/themefiles/d
 * 2) For every theme read its corresponding src/statics files and put them into new XML
 * 3) Save new XMLs
 *
 * @returns {Promise<Awaited<unknown>[]>}
 */
exports.buildInternalXmls = async function buildInternalXmls () {
  const THEMES = getThemesProjectInfo()

  const promises = []

  if (THEMES) {
    for (const [themeType, themesOfType] of Object.entries(THEMES)) {
      for (const themeConfig of themesOfType) {

        //theme basic props
        const newInternalXml = {
          _attributes: {
            ...themeConfig._attributes,
            lastModified: getLastModified()
          }
        }

        //read statics to write them into new XML
        const staticsPath = path.join('src', 'statics', themeConfig.themeType, themeConfig.id)

        const staticFiles = fs.readdirSync(staticsPath)
          .filter(entry => Object.values(themeStaticFiles).includes(entry))

        for (const fileName of staticFiles) {
          const recordName = objectReverse(themeStaticFiles)[fileName]
          newInternalXml[recordName] = {
            _cdata: fs.readFileSync(path.join(staticsPath, fileName)).toString()
          }
        }

        // re-save style files properties
        if (themeConfig.styleFiles) {
          newInternalXml.styleFiles = themeConfig.styleFiles
        }

        const themeDefinitionPath = path.join(
          PATH_THEME_DEFINITIONS,
          themeTypeIds[themeType],
          themeConfig._attributes.id + '.xml'
        )

        promises.push(writeNewThemeXML(newInternalXml, themeDefinitionPath))
      }
    }
  }

  return Promise.all(promises)
}

const defaultFileProps = {
  applyToAuthorizationRequests: false,
  applyToModals: false,
  applyToNonModals: true,
  internetExplorerMaxVersion: '',
  isRightToLeft: '',
  mediaQuery: ''
}

function getStyleFileProps (styleFileRecords, fileName) {
  if (styleFileRecords && styleFileRecords.file) {
    const fileProps = styleFileRecords.file
      .map(r => r._attributes)
      .filter(r => r)
      .find(r => r.name === fileName)
    return fileProps || defaultFileProps
  }
  return defaultFileProps
}

function readThemeAttachments (themeConfig, themeType, subPath, xmlRecordName) {
  const objectPart = {}

  const attachmentsPath = path.join(
    PATH_THEME_FILES_FD,
    themeTypeFolders[themeType],
    themeConfig._attributes.id,
    subPath
  )

  if (fs.existsSync(attachmentsPath)) {
    const filesList = fs.readdirSync(attachmentsPath)

    if (filesList.length) {
      objectPart[xmlRecordName] = { file: [] }

      for (const fileName of filesList) {
        const fileContents = fs.readFileSync(path.join(attachmentsPath, fileName))

        const newFileRecord = {
          _attributes: { name: fileName },
          _cdata: binaryToBase64(fileContents)
        }

        if (xmlRecordName === 'styleFiles') {
          newFileRecord._attributes = {
            ...newFileRecord._attributes,
            ...getStyleFileProps(themeConfig.styleFiles, fileName)
          }
        }

        objectPart[xmlRecordName].file.push(newFileRecord)
      }
    }
  }

  return objectPart
}

function readThemePreview (themeConfig, themeType) {
  const objectPart = {}

  const previewPath = path.join(
    PATH_THEME_FILES_FD,
    themeTypeFolders[themeType],
    themeConfig._attributes.id,
    'preview'
  )

  if (fs.existsSync(previewPath)) {
    const filesList = fs.readdirSync(previewPath)

    objectPart.previewImage = {
      _attributes: { name: filesList[0] },
      _cdata: binaryToBase64(fs.readFileSync(path.join(previewPath, filesList[0])))
    }
  }

  return objectPart
}

/**
 * 1) Read theme configs from verint/filestorage/themefiles/d
 * 2) Read file attachments from verint/filestorage/themefiles/fd for each theme
 * 3) Save themes as distributive XML to ./distrib
 *
 * @returns {Promise<Awaited<unknown>[]>}
 */
exports.buildBundleXmls = async function buildBundleXmls () {
  const THEMES = getThemesProjectInfo()

  const promises = []

  if (THEMES) {
    for (const [themeType, themesOfType] of Object.entries(THEMES)) {
      for (const themeConfig of themesOfType) {

        //read current theme XML definition
        let themeObjectXml = getXmlTheme(path.join(
          PATH_THEME_DEFINITIONS,
          themeTypeIds[themeType],
          themeConfig.id + '.xml'
        ))

        // add preview and attachments
        themeObjectXml = {
          ...themeObjectXml,
          ...readThemePreview(themeConfig, themeType),
          ...readThemeAttachments(themeConfig, themeType, 'files', 'files'),
          ...readThemeAttachments(themeConfig, themeType, 'jsfiles', 'javascriptFiles'),
          ...readThemeAttachments(themeConfig, themeType, 'stylesheetfiles', 'styleFiles'),
        }

        const distribPath = ifCreatePath('', path.join(
          'distrib',
          themeType,
          themeConfig.id
        ))

        // save new distributive XML
        promises.push(writeNewThemeXML(
          themeObjectXml,
          path.join(distribPath, widgetSafeName(themeConfig.name) + '.xml')
        ))
      }
    }
  }

  return Promise.all(promises)
}