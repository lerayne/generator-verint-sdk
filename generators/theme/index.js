const path = require('path')
const execa = require('execa')
const fs = require('fs')
const BaseGenerator = require('../../src/BaseGenerator')
const { getXmlTheme, writeNewThemeXML } = require('../../src/xml')
const { writeAttachments, writeStatics, writeThemePreview } = require('../../src/xml-gen')
const { ifCreatePath } = require('../../src/filesystem')
const { themeTypeIds, themeTypeFolders } = require('../../src/constants/global')
const { PATH_THEME_DEFINITIONS, PATH_THEME_FILES_FD } = require('../../src/constants/paths')
const validateProjectName = require('../../src/validators/validateProjectName')
const validateEmail = require('../../src/validators/validateEmail')


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
    const pathChunks = this.env.cwd.split(path.sep)
    const folderName = pathChunks[pathChunks.length - 1]

    let scaffolded = this.inputData.existingPackageJson.keywords
      && this.inputData.existingPackageJson.keywords.includes('scaffolded')

    if (scaffolded) scaffolded = 'Disabled: Project is already scaffolded'

    const userName = await execa.command('git config --get user.name')
    const userEmail = await execa.command('git config --get user.email')

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
      },

      {
        type: 'input',
        name: 'projectName',
        message: 'Enter project name',
        validate: validateProjectName.bind(this),
        default: folderName,
        when: answers => ['new-xml'].includes(answers.mode),
      },

      // TODO: add validators to the rest of input options
      // Author name for package.json
      {
        type: 'input',
        name: 'userName',
        message: 'Project author name',
        default: userName.stdout,
        when: answers => ['new-xml'].includes(answers.mode),
      },

      // Author email for package.json
      {
        type: 'input',
        name: 'userEmail',
        message: 'Project author email',
        default: userEmail.stdout,
        validate: validateEmail.bind(this),
        when: answers => ['new-xml'].includes(answers.mode),
      },
    ])
  }

  async configuring () {
    const { filePath, mode, projectName, userName, userEmail } = this.answers

    //only on "new" or "convert"
    if (['new-xml'].includes(mode)) {
      // reading template of package.json
      const packageJson = JSON.parse(fs.readFileSync(this.templatePath('package.json')))

      this.packageJson.merge(packageJson)

      //adding data to package.json
      this.packageJson.merge({
        name: projectName,
        author: `${userName} <${userEmail}>`
      })
    }

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
    const themeXmlPath = ifCreatePath(
      this.destinationPath(),
      path.join(PATH_THEME_DEFINITIONS, themeTypeIds[themeType])
    )

    const themeFilesPath = ifCreatePath(
      this.destinationPath(),
      path.join(PATH_THEME_FILES_FD, themeTypeFolders[themeType], themeConfig._attributes.id)
    )

    const themeStaticsPath = ifCreatePath(
      this.destinationPath(),
      path.join('src', 'statics', themeType, themeConfig._attributes.id)
    )

    await this._processThemeDefinition(themeConfig, themeXmlPath, themeFilesPath, themeStaticsPath)

    return null
  }

  async _processThemeDefinition (themeXmlObject, themeXmlPath, themeFilesPath, themeStaticsPath) {
    const { _attributes } = themeXmlObject

    //create "clean" XML w/o attachments for Verint's FS
    const widgetXmlObjectInternal = {}

    const staticFiles = {
      headScript: 'headScript.vm',
      bodyScript: 'bodyScript.vm',
      configuration: 'configuration.xml',
      paletteTypes: 'paletteTypes.xml',
      languageResources: 'languageResources.xml'
    }

    const internalRecords = [ ...Object.keys(staticFiles), '_attributes' ]

    for (const recordName of Object.keys(themeXmlObject)) {
      if (internalRecords.includes(recordName)) {
        widgetXmlObjectInternal[recordName] = themeXmlObject[recordName]
      }
    }

    await writeNewThemeXML(widgetXmlObjectInternal, `${themeXmlPath}/${_attributes.id}.xml`)

    // write attachments
    writeAttachments(themeXmlObject, 'files', themeFilesPath, 'files')
    writeAttachments(themeXmlObject, 'javascriptFiles', themeFilesPath, 'jsfiles')
    writeAttachments(themeXmlObject, 'styleFiles', themeFilesPath, 'stylesheetfiles')

    writeStatics(themeXmlObject, themeStaticsPath, staticFiles)

    //write preview image
    writeThemePreview(themeXmlObject, themeFilesPath)
  }
}