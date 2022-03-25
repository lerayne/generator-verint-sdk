const path = require('path')
const fs = require('fs')
const getThemesProjectInfo = require('../getThemesProjectInfo')
const { getLastModified, objectReverse, binaryToBase64, widgetSafeName } = require('../utils')
const { themeStaticFiles, themeTypeIds, themeTypeFolders } = require('../constants/global')
const { PATH_THEME_DEFINITIONS, PATH_THEME_FILES_FD } = require('../constants/paths')
const { writeNewThemeXML, getXmlTheme } = require('../xml')
const { ifCreatePath } = require('../filesystem')

exports.buildInternalXmls = async function buildInternalXmls () {
  const THEMES = getThemesProjectInfo()

  const promises = []

  if (THEMES) {
    for (const [themeType, themesOfType] of Object.entries(THEMES)) {
      for (const themeConfig of themesOfType) {
        const newInternalXml = {
          _attributes: {
            ...themeConfig._attributes,
            lastModified: getLastModified()
          }
        }

        const staticsPath = path.join('src', 'statics', themeConfig.themeType, themeConfig.id)

        const staticFiles = fs.readdirSync(staticsPath)
          .filter(entry => Object.values(themeStaticFiles).includes(entry))

        for (const fileName of staticFiles) {
          const recordName = objectReverse(themeStaticFiles)[fileName]
          newInternalXml[recordName] = {
            _cdata: fs.readFileSync(path.join(staticsPath, fileName)).toString()
          }
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

function readThemeAttachments (themeConfig, themeType, subPath, xmlRecordName) {
  const objectPart = {}

  const attachmentsPath = path.join(
    PATH_THEME_FILES_FD,
    themeTypeFolders[themeType],
    themeConfig._attributes.id,
    subPath
  )

  if (fs.existsSync(attachmentsPath)) {
    objectPart[xmlRecordName] = {
      file: []
    }

    const filesList = fs.readdirSync(attachmentsPath)

    for (const fileName of filesList) {
      const fileContents = fs.readFileSync(path.join(attachmentsPath, fileName))

      objectPart[xmlRecordName].file.push({
        _attributes: { name: fileName },
        _cdata: binaryToBase64(fileContents)
      })
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

exports.buildBundleXmls = async function buildBundleXmls () {
  const THEMES = getThemesProjectInfo()

  const promises = []

  if (THEMES) {
    for (const [themeType, themesOfType] of Object.entries(THEMES)) {
      for (const themeConfig of themesOfType) {
        let themeObjectXml = getXmlTheme(path.join(
          PATH_THEME_DEFINITIONS,
          themeTypeIds[themeType],
          themeConfig.id + '.xml'
        ))

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

        promises.push(writeNewThemeXML(
          themeObjectXml,
          path.join(distribPath, widgetSafeName(themeConfig.name) + '.xml')
        ))
      }
    }
  }

  return Promise.all(promises)
}