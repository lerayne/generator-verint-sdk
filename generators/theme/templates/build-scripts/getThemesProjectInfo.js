// eslint-disable-next-line import/no-unused-modules
const path = require('path')
const fs = require('fs')

const { PATH_THEME_DEFINITIONS } = require('./constants/paths')
const { themeTypeIds } = require('./constants/global')
const { objectReverse } = require('./utils')
const { getXmlTheme } = require('./xml')

function getThemeInfo (themeType, xmlFilePath) {
  const themeXml = getXmlTheme(xmlFilePath)
  const { _attributes, styleFiles, scopedProperties } = themeXml

  const {
    id,
    themeTypeId,
    name, 
  } = _attributes

  const newThemeInfo = {
    id,
    name,
    themeType,
    themeTypeId,
    _attributes,
  }

  if (styleFiles && styleFiles.file) {
    newThemeInfo.styleFiles = {
      file: styleFiles.file.length ? styleFiles.file : [styleFiles.file],
    }
  }

  if (scopedProperties) {
    newThemeInfo.scopedProperties = scopedProperties
  }

  return newThemeInfo
}

module.exports = function getThemesProjectInfo () {
  const themeInfo = {
    site:  [],
    group: [],
    blog:  [],
  }

  if (!fs.existsSync(PATH_THEME_DEFINITIONS)) return null

  const themeDefinitionsDirs = fs.readdirSync(PATH_THEME_DEFINITIONS)
    .filter(entryName => fs.lstatSync(path.join(PATH_THEME_DEFINITIONS, entryName)).isDirectory())

  for (const dirName of themeDefinitionsDirs) {
    const themeType = objectReverse(themeTypeIds)[dirName]
    if (themeType) {
      const themeTypeContents = fs.readdirSync(path.join(PATH_THEME_DEFINITIONS, dirName))
      const subGroupXmls = themeTypeContents.filter(entry => entry.match(/^[a-f\d]{32}\.xml$/iu))

      for (const themeDefFile of subGroupXmls) {
        themeInfo[themeType].push(getThemeInfo(themeType, path.join(
          PATH_THEME_DEFINITIONS,
          dirName,
          themeDefFile
        )))
      }
    }
  }

  return themeInfo
}
