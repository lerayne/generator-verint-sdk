const path = require('path')
const fs = require('fs')

const { xml2js } = require('xml-js')
const inquirer = require('inquirer')
const yaml = require('js-yaml')

const getThemesProjectInfo = require('../getThemesProjectInfo')
const {
  getLastModified,
  objectReverse,
  binaryToBase64,
  widgetSafeName,
  getNewDescription,
} = require('../utils')
const { themeStaticFiles, themeTypeIds, themeTypeFolders } = require('../constants/global')
const {
  PATH_THEME_DEFINITIONS,
  PATH_THEME_FILES_FD,
  PATH_THEME_LAYOUTS,
  PATH_WIDGETS,
} = require('../constants/paths')
const { writeNewThemeXML, getXmlTheme, getXmlWidgets } = require('../xml')
const { ifCreatePath } = require('../filesystem')
const { writeWidgetInternalXML } = require('../writeWidgetInternalXML')
const { readWidgetToBundle } = require('../readWidgetToBundle')
const packageJson = require('../../package.json')

function getDirsList (somePath) {
  return fs.readdirSync(somePath).filter(entryName => (
    fs.lstatSync(path.join(somePath, entryName)).isDirectory()
  ))
}

function promiseFidgetFileWrites (staticsPath) {
  const promises = []
  // read theme's widgets and write their XMLs in local FS
  const widgetsStaticsPath = path.join(staticsPath, 'widgets')

  if (fs.existsSync(widgetsStaticsPath)) {
    const providerIdDirs = getDirsList(widgetsStaticsPath)

    if (providerIdDirs.length) {
      for (const providerId of providerIdDirs) {
        const widgetIdDirs = getDirsList(path.join(widgetsStaticsPath, providerId))

        for (const widgetId of widgetIdDirs) {
          promises.push(writeWidgetInternalXML(widgetsStaticsPath, providerId, widgetId))
        }
      }
    }
  }

  return promises
}

function layoutsExist (themes) {
  return Object.values(themes)
    .some(themesOfType => (
      themesOfType.some(themeConfig => (
        fs.existsSync(path.join(
          PATH_THEME_LAYOUTS,
          String(themeConfig._attributes.id),
          `${themeConfig._attributes.themeTypeId}.xml`
        ))
      ))
    ))
}

function widgetsExist () {
  // find if there are any widgets in the project
  const widgetProvidersPathExists = fs.existsSync(PATH_WIDGETS)

  if (!widgetProvidersPathExists) return false

  const providerDirs = getDirsList(PATH_WIDGETS)

  if (!providerDirs.length) return false

  return providerDirs.some(dirName => {
    const contents = fs.readdirSync(path.join(PATH_WIDGETS, dirName))
    return contents.find(fileName => fileName.match(/\.xml$/ui))
  })
}

/**
 * 1) Read theme configs from verint/filestorage/themefiles/d
 * 2) For every theme read its corresponding src/statics files and put them into new XML
 * 3) Save new XMLs
 *
 * @returns {Promise<Awaited<unknown>[]>}
 */
exports.buildInternalXmls = async function buildInternalXmls () {
  const THEMES = getThemesProjectInfo()

  let promises = []

  if (THEMES) {
    for (const [themeType, themesOfType] of Object.entries(THEMES)) {
      for (const themeConfig of themesOfType) {

        // theme basic props
        const newInternalXml = {
          _attributes: {
            ...themeConfig._attributes,
            lastModified: getLastModified(),
            description:  getNewDescription(
              themeConfig._attributes.description,
              packageJson.version
            ),
          },
        }

        // read statics to write them into new XML
        const staticsPath = path.join('src', 'statics', themeConfig.themeType, themeConfig.id)

        const staticFiles = fs.readdirSync(staticsPath)
          .filter(entry => Object.values(themeStaticFiles).includes(entry))

        for (const fileName of staticFiles) {
          // get XML tag name from file name
          const recordName = objectReverse(themeStaticFiles)[fileName]
          newInternalXml[recordName] = {
            _cdata: fs.readFileSync(path.join(staticsPath, fileName)).toString(),
          }
        }

        // re-save style files properties
        if (themeConfig.styleFiles) {
          newInternalXml.styleFiles = themeConfig.styleFiles
        }

        // re-save scoped properties
        if (themeConfig.scopedProperties) {
          newInternalXml.scopedProperties = themeConfig.scopedProperties
        }

        const themeDefinitionPath = path.join(
          PATH_THEME_DEFINITIONS,
          themeTypeIds[themeType],
          `${themeConfig._attributes.id}.xml`
        )

        promises.push(writeNewThemeXML(newInternalXml, themeDefinitionPath))

        promises = [...promises, ...promiseFidgetFileWrites(staticsPath)]
      }
    }
  }

  return Promise.all(promises)
}

const defaultFileProps = {
  applyToAuthorizationRequests: false,
  applyToModals:                false,
  applyToNonModals:             true,
  internetExplorerMaxVersion:   '',
  isRightToLeft:                '',
  mediaQuery:                   '',
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
          _cdata:      binaryToBase64(fileContents),
        }

        if (xmlRecordName === 'styleFiles') {
          newFileRecord._attributes = {
            ...newFileRecord._attributes,
            ...getStyleFileProps(themeConfig.styleFiles, fileName),
          }
        }

        objectPart[xmlRecordName].file.push(newFileRecord)
      }
    }
  }

  return objectPart
}

function readThemeLayouts (themeConfig) {
  const objectPart = {}

  const layoutsPath = path.join(
    PATH_THEME_LAYOUTS,
    themeConfig._attributes.id,
    `${themeConfig._attributes.themeTypeId}.xml`
  )

  if (fs.existsSync(layoutsPath)) {
    const layoutsXml = xml2js(fs.readFileSync(layoutsPath), { compact: true })

    objectPart.pageLayouts = {}

    if (layoutsXml?.theme?.defaultHeaders) {
      objectPart.pageLayouts.headers = layoutsXml.theme.defaultHeaders
    }

    if (layoutsXml?.theme?.defaultFooters) {
      objectPart.pageLayouts.footers = layoutsXml.theme.defaultFooters
    }

    if (layoutsXml?.theme?.defaultFragmentPages) {
      objectPart.pageLayouts.pages = layoutsXml.theme.defaultFragmentPages
    }
  }

  return objectPart
}

function readWidgets (themeConfig, includeOOTB, includeCustom) {
  let objectPart = {}

  const { id: themeId, themeTypeId } = themeConfig._attributes

  const themeType = objectReverse(themeTypeIds)[themeTypeId]
  const themeWidgetProvidersPath = path.join('src', 'statics', themeType, themeId, 'widgets')

  if (fs.existsSync(themeWidgetProvidersPath)) {
    const themeWidgetProviders = getDirsList(themeWidgetProvidersPath)

    for (const provider of themeWidgetProviders) {
      const providerPath = path.join(themeWidgetProvidersPath, provider)
      const yamlFile = yaml.load(fs.readFileSync(path.join(providerPath, 'provider.yaml')))
      if (
        yamlFile && (
          (yamlFile.widgetProviderType === 'OOTB' && includeOOTB)
          || (yamlFile.widgetProviderType === 'custom' && includeCustom)
        )
      ) {
        const widgetIds = getDirsList(providerPath)
        for (const widgetId of widgetIds) {
          const widgetXmlPath = path.join(PATH_WIDGETS, provider, `${widgetId}.xml`)
          const widgetAttachmentsPath = path.join(PATH_WIDGETS, provider, widgetId)

          if (fs.existsSync(widgetXmlPath)) {
            if (!objectPart.contentFragments) {
              objectPart = {
                contentFragments: {
                  scriptedContentFragments: {
                    scriptedContentFragment: [],
                  },
                },
              }
            }

            const [widgetXmlObject] = getXmlWidgets(widgetXmlPath)

            objectPart.contentFragments.scriptedContentFragments.scriptedContentFragment.push(
              readWidgetToBundle(widgetXmlObject, widgetAttachmentsPath)
            )
          }
        }
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
      _cdata:      binaryToBase64(fs.readFileSync(path.join(previewPath, filesList[0]))),
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

    // gathering theme data for inquiring
    const questions = []
    let answers = {}

    // find if any theme has page layouts in its sources
    const pageLayoutsFound = layoutsExist(THEMES)
    const widgetsFound = widgetsExist()

    // adding questions
    if (pageLayoutsFound) {
      questions.push({
        'type':    'confirm',
        'name':    'includeLayouts',
        'message': 'Do you want to include page layouts to the bundle?',
        'default': true,
      })
    }

    if (widgetsFound) {
      questions.push({
        'type':    'confirm',
        'name':    'includeOotbWidgets',
        'message': 'Do you want to include modified OOTB widgets to the bundle?',
        'default': true,
      })

      questions.push({
        'type':    'confirm',
        'name':    'includeCustomWidgets',
        'message': 'Do you want to include custom widgets to the bundle?',
        'default': true,
      })
    }

    // inquiring
    if (questions.length) {
      answers = await inquirer.prompt(questions)
    }

    // writing bundle XMLs
    for (const [themeType, themesOfType] of Object.entries(THEMES)) {
      for (const themeConfig of themesOfType) {

        // read current theme XML definition
        let themeObjectXml = getXmlTheme(path.join(
          PATH_THEME_DEFINITIONS,
          themeTypeIds[themeType],
          `${themeConfig.id}.xml`
        ))

        // add preview and attachments
        themeObjectXml = {
          ...themeObjectXml,
          ...readThemePreview(themeConfig, themeType),
          ...readThemeAttachments(themeConfig, themeType, 'files', 'files'),
          ...readThemeAttachments(themeConfig, themeType, 'jsfiles', 'javascriptFiles'),
          ...readThemeAttachments(themeConfig, themeType, 'stylesheetfiles', 'styleFiles'),
        }

        if (answers.includeLayouts) {
          themeObjectXml = {
            ...themeObjectXml,
            ...readThemeLayouts(themeConfig),
          }
        }

        if (answers.includeOotbWidgets || answers.includeCustomWidgets) {
          themeObjectXml = {
            ...themeObjectXml,
            pageLayouts: {
              ...themeObjectXml.pageLayouts || {},
              ...readWidgets(themeConfig, answers.includeOotbWidgets, answers.includeCustomWidgets),
            },
          }
        }

        const distribPath = ifCreatePath('', path.join(
          'distrib',
          themeType,
          themeConfig.id
        ))

        const themeSafeName = widgetSafeName(themeConfig.name)

        // save new distributive XML
        promises.push(writeNewThemeXML(
          themeObjectXml,
          path.join(distribPath, `${themeSafeName}-${themeType.toUpperCase()}-${packageJson.version}.xml`)
        ))
      }
    }
  }

  return Promise.all(promises)
}
