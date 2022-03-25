const BaseGenerator = require('../../src/BaseGenerator')
const {
  getXmlTheme,
  writeNewThemeXML,
  writeAttachments,
  writeStatics,
  writeThemePreview
} = require('../../src/xml')
const { ifCreatePath } = require('../../src/filesystem')
const { themeTypeIds, themeTypeFolders } = require('../../src/constants/global')
const {
  PATH_THEME_DEFINITIONS,
  PATH_THEME_FILES_FD
} = require('../../src/constants/paths')
const path = require('path')

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
            name: 'Create a new theme project using existing XML',
            value: 'new-xml',
            disabled: scaffolded
          }, {
            name: 'Add a theme to the project using existing XML',
            value: 'add-xml',
            disabled: scaffolded
          },
        ],
        default: 'new-xml'
      },

      // Selection of XML file
      {
        type: 'list',
        name: 'filePath',
        message: 'Select an XML file',
        choices: this._getXmlFilesChoices,
        when: answers => answers.mode === 'new-xml'
      },

      {
        type: 'list',
        name: 'themeType',
        message: 'Select the theme type',
        choices: [
          { name: 'Site', value: 'site' },
          { name: 'Group', value: 'group' },
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

    if (mode === 'new-xml') {
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
    const pathThemeXmlFinal = path.join(PATH_THEME_DEFINITIONS, themeTypeIds[themeType])
    const themeXmlPath = ifCreatePath(this.destinationPath(), pathThemeXmlFinal)

    const pathThemeFilesFinal = (
      path.join(PATH_THEME_FILES_FD, themeTypeFolders[themeType], themeConfig._attributes.id)
    )
    const themeFilesPath = ifCreatePath(this.destinationPath(), pathThemeFilesFinal)

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
    const nonStaticEntries = [
      'files',
      'javascriptFiles',
      'styleFiles',
      'pageLayouts',
      'scopedProperties',
      'previewImage'
    ]

    for (const recordName of Object.keys(themeXmlObject)) {
      if (!nonStaticEntries.includes(recordName)) {
        widgetXmlObjectInternal[recordName] = themeXmlObject[recordName]
      }
    }

    await writeNewThemeXML(widgetXmlObjectInternal, `${themeXmlPath}/${_attributes.id}.xml`)

    // write attachments
    writeAttachments(themeXmlObject, 'files', themeFilesPath, 'files')
    writeAttachments(themeXmlObject, 'javascriptFiles', themeFilesPath, 'jsfiles')
    writeAttachments(themeXmlObject, 'styleFiles', themeFilesPath, 'stylesheetfiles')

    //write static source files
    const staticsPath = ifCreatePath(this.destinationPath(), 'src/statics')

    writeStatics(themeXmlObject, staticsPath, {
      headScript: 'headScript.vm',
      bodyScript: 'bodyScript.vm',
      configuration: 'configuration.xml',
      paletteTypes: 'paletteTypes.xml',
      languageResources: 'languageResources.xml'
    })

    //write preview image
    writeThemePreview(themeXmlObject, themeFilesPath)
  }
}