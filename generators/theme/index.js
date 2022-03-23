const BaseGenerator = require('../../src/BaseGenerator')
const { getXmlTheme, writeNewThemeXML, writeAttachments } = require('../../src/xml')
const { ifCreatePath } = require('../../src/filesystem')
const { themeTypeIds, themeTypeFolders } = require('../../src/constants/global')
const {
  PATH_THEME_DEFINITIONS,
  PATH_THEME_FILES_FD
} = require('../../src/constants/paths')
const fs = require('fs')
const path = require('path')
const { base64toText, base64ToBinary } = require('../../src/utils')

module.exports = class VerintTheme extends BaseGenerator {
  initializing () {
    this._sayHello()
    this._verifyEnvironment()

    this.inputData = {
      themeConfig: [],
      existingPackageJson: this._getExistingPackageJson()
    }
  }

  async prompting () {
    let scaffolded = this.inputData.existingPackageJson.keywords
      && this.inputData.existingPackageJson.keywords.includes('scaffolded')

    if (scaffolded) scaffolded = 'Disabled: Project is already scaffolded'

    this.answers = await this.prompt([
      // Selection of scenario
      {
        type: 'list',
        name: 'mode',
        message: 'Is it a new widget or a conversion of an existing one?',
        choices: [
          {
            name: 'Create a new theme project from existing XML',
            value: 'convert',
            disabled: scaffolded
          },
        ],
        default: 'convert'
      },

      // Selection of XML file
      {
        type: 'list',
        name: 'filePath',
        message: 'Select an XML file',
        choices: this._getXmlFilesChoices,
        when: answers => answers.mode === 'convert'
      },

      {
        type: 'list',
        name: 'themeType',
        message: 'Select the theme type',
        choices: [
          { name: 'Site', value: 'site' },
          { name: 'Group', value: 'group'},
          { name: 'Blog', value: 'blog' }
        ]
      }
    ])
  }

  async configuring () {
    const { filePath } = this.answers

    this.inputData.themeConfig = getXmlTheme(this.destinationPath(filePath))
  }

  async writing () {
    const { mode, themeType } = this.answers
    const { themeConfig } = this.inputData

    if (mode === 'convert') {
      this._copyWithRename('', '', [
        ['gulpfile.js', 'gulpfile.js'],
        ['nvmrc-template', '.nvmrc'],
        ['npmrc-template', '.npmrc'],
        ['gitignore-template', '.gitignore'],
      ])

      // this._copyFiles('build-scripts/gulp', 'build-scripts/gulp', ['main.js'])
      // this._copyFiles('build-scripts', 'build-scripts', ['getProjectInfo.js'])
      // this._copyFiles('verint', 'verint', ['README.md'])

      /*this._copyFiles('../../../src', 'build-scripts', [
        'utils.js',
        'filesystem.js',
        'xml.js',
      ])*/
    }

    // these have "if not exists" inside, so OK
    const pathThemeXmlFinal = PATH_THEME_DEFINITIONS + '/' + themeTypeIds[themeType]
    ifCreatePath(this.destinationPath(), pathThemeXmlFinal)
    const themeXmlPath = this.destinationPath(pathThemeXmlFinal)

    const pathThemeFilesFinal = (
      `${PATH_THEME_FILES_FD}/${themeTypeFolders[themeType]}/${themeConfig._attributes.id}`
    )
    ifCreatePath(this.destinationPath(), pathThemeFilesFinal)
    const themeFilesPath = this.destinationPath(pathThemeFilesFinal)

    await this._processThemeDefinition(themeConfig, themeXmlPath, themeFilesPath)

    /*this.fs.write(
      this.destinationPath(filePath + '.json'),
      JSON.stringify(this.inputData.themeConfigs, null, 2)
    )*/
  }

  async _processThemeDefinition (themeXmlObject, themeXmlPath, themeFilesPath) {
    const { _attributes } = themeXmlObject

    //create "clean" XML w/o attachments for Verint's FS
    const widgetXmlObjectInternal = {}
    const nonStandardEntries = [
      'files',
      'javascriptFiles',
      'styleFiles',
      'pageLayouts',
      'scopedProperties',
      'previewImage'
    ]

    for (const recordName of Object.keys(themeXmlObject)) {
      if (!nonStandardEntries.includes(recordName)) {
        widgetXmlObjectInternal[recordName] = themeXmlObject[recordName]
      }
    }

    await writeNewThemeXML(widgetXmlObjectInternal, `${themeXmlPath}/${_attributes.id}.xml`)

    writeAttachments(themeXmlObject, 'files', themeFilesPath, 'files')
    writeAttachments(themeXmlObject, 'javascriptFiles', themeFilesPath, 'jsfiles')
    writeAttachments(themeXmlObject, 'styleFiles', themeFilesPath, 'stylesheetfiles')
  }
}