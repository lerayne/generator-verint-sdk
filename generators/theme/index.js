const path = require('path')
const fs = require('fs')

const execa = require('execa')

const BaseGenerator = require('../../src/BaseGenerator')
const { getXmlTheme, writeNewThemeXML } = require('../../src/xml')
const {
  writeAttachments,
  writeStatics,
  writeThemePreview,
  writePageLayouts,
} = require('../../src/filesystem-generator')
const { ifCreatePath } = require('../../src/filesystem')
const { themeTypeIds, themeTypeFolders, themeStaticFiles } = require('../../src/constants/global')
const {
  PATH_THEME_DEFINITIONS,
  PATH_THEME_FILES_FD,
  PATH_THEME_LAYOUTS, PATH_WIDGETS,
} = require('../../src/constants/paths') 
const validateProjectName = require('../../src/validators/validateProjectName')
const validateEmail = require('../../src/validators/validateEmail')
const { widgetProviders } = require('../../src/constants/ootbWidgets')
const VerintWidget = require('../widget')
const { widgetSafeName } = require('../../src/utils')

module.exports = class VerintTheme extends BaseGenerator {
  initializing () {
    this._sayHello()
    this._verifyEnvironment()

    this.inputData = {
      themeConfig:         [],
      existingPackageJson: this._getExistingPackageJson(),
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
        'type':    'list',
        'name':    'mode',
        'message': 'Is it a new widget or a conversion of an existing one?',
        'choices': [
          {
            name:     'Create a new theme project using existing XML',
            value:    'new-xml',
            disabled: scaffolded,
          }, {
            name:  'Add a theme to the project using existing XML',
            value: 'add-xml',
          },
        ],
        'default': 'new-xml',
      },

      // Selection of XML file
      {
        type:    'list',
        name:    'filePath',
        message: 'Select an XML file',
        choices: this._getXmlFilesChoices,
      },

      {
        type:    'list',
        name:    'themeType',
        message: 'Select the theme type',
        choices: [
          { name: 'Site', value: 'site' },
          { name: 'Group', value: 'group' },
          { name: 'Blog', value: 'blog' },
        ],
      },

      {
        'type':     'input',
        'name':     'projectName',
        'message':  'Enter project name',
        'validate': validateProjectName.bind(this),
        'default':  folderName,
        'when':     answers => ['new-xml'].includes(answers.mode),
      },

      // TODO: add validators to the rest of input options
      // Author name for package.json
      {
        'type':    'input',
        'name':    'userName',
        'message': 'Project author name',
        'default': userName.stdout,
        'when':    answers => ['new-xml'].includes(answers.mode),
      },

      // Author email for package.json
      {
        'type':     'input',
        'name':     'userEmail',
        'message':  'Project author email',
        'default':  userEmail.stdout,
        'validate': validateEmail.bind(this),
        'when':     answers => ['new-xml'].includes(answers.mode),
      },
    ])
  }

  configuring () {
    const { filePath, mode, projectName, userName, userEmail } = this.answers

    // only on "new" or "convert"
    if (['new-xml'].includes(mode)) {
      // reading template of package.json
      const packageJson = JSON.parse(fs.readFileSync(this.templatePath('package.json')))

      this.packageJson.merge(packageJson)

      // adding data to package.json
      this.packageJson.merge({
        name:   projectName,
        author: `${userName} <${userEmail}>`,
      })
    }

    this.inputData.themeConfig = getXmlTheme(this.destinationPath(filePath))
  }

  async writing () {
    const { themeType } = this.answers
    const { themeConfig } = this.inputData

    this._copyTemplates()

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

    let themeLayoutsPath = ''
    if (themeConfig.pageLayouts) {
      themeLayoutsPath = ifCreatePath(
        this.destinationPath(),
        path.join(PATH_THEME_LAYOUTS, themeConfig._attributes.id)
      )
    }

    const { includeWidgets } = await this.prompt([
      {
        'type':    'confirm',
        'name':    'includeWidgets',
        'message': 'Do you want to include widgets to theme project? If yes, OOTB widgets will'
          + ' be included automatically, custom widgets will be asked for',
        'default': true,
      },
    ])

    let themeWidgetsPath = ''
    const themeWidgetsOOTB = []
    const themeWidgetsCustom = []

    if (includeWidgets) {

      let themeWidgets = themeConfig.pageLayouts.contentFragments
        && themeConfig.pageLayouts.contentFragments.scriptedContentFragments
        && themeConfig.pageLayouts.contentFragments.scriptedContentFragments.scriptedContentFragment

      if (themeWidgets) {
        themeWidgetsPath = ifCreatePath(
          this.destinationPath(),
          PATH_WIDGETS
        )

        if (!(themeWidgets instanceof Array)) themeWidgets = [themeWidgets]

        // copying to avoid mutation
        themeWidgets = [...themeWidgets]

        for (const widget of themeWidgets) {
          // console.log(widget._attributes.name, widget._attributes.instanceIdentifier)
          // find a provider for this widget among OOTB providers
          const widgetProvider = widgetProviders.find(provider => (
            provider.widgetIds.some(id => (
              id === widget._attributes.instanceIdentifier || id === widget._attributes.instanceId
            ))
          ))

          if (widgetProvider) {
            // if found - add this widget to OOTB scope (we store them in repo by default)
            themeWidgetsOOTB.push({
              ...widget,
              _attributes: {
                ...widget._attributes,
                providerId: widgetProvider.id,
              },
            })
          } else {
            // if not found - add it to custom scope (we'll ask for its inclusion to repo)
            themeWidgetsCustom.push(widget)
          }
        }
      }

      console.log('themeWidgetsOOTB', themeWidgetsOOTB.length)
    }

    // Start writing files

    const { _attributes } = themeConfig

    // create "clean" XML w/o attachments for Verint FS
    const widgetXmlObjectInternal = {}

    const internalRecords = [...Object.keys(themeStaticFiles), '_attributes', 'scopedProperties']

    for (const [recordName, recordValue] of Object.entries(themeConfig)) {
      // copy static files
      if (internalRecords.includes(recordName)) {
        widgetXmlObjectInternal[recordName] = recordValue
      }

      // separate processing of styleFiles, because they have options that need to be saved
      if (recordName === 'styleFiles' && recordValue.file) {
        const styleFiles = (recordValue.file.length) ? recordValue.file : [recordValue.file]

        // save style file definitions in internal XML file, but throw away the contents
        widgetXmlObjectInternal.styleFiles = {
          file: styleFiles.map(file => {
            const { _cdata, ...rest } = file
            return rest
          }),
        }
      }
    }

    await writeNewThemeXML(widgetXmlObjectInternal, `${themeXmlPath}/${_attributes.id}.xml`)

    // write attachments
    writeAttachments(themeConfig, 'files', themeFilesPath, 'files')
    writeAttachments(themeConfig, 'javascriptFiles', themeFilesPath, 'jsfiles')
    writeAttachments(themeConfig, 'styleFiles', themeFilesPath, 'stylesheetfiles')

    writeStatics(themeConfig, themeStaticsPath, themeStaticFiles)

    // write preview image
    writeThemePreview(themeConfig, themeFilesPath)

    // write page layouts
    writePageLayouts(themeConfig, themeLayoutsPath)

    if (includeWidgets) {
      if (themeWidgetsOOTB) {
        for (const widget of themeWidgetsOOTB) {
          // eslint-disable-next-line no-await-in-loop
          await VerintWidget._processWidgetDefinition(
            widget,
            themeWidgetsPath,
            attributes => ifCreatePath(themeStaticsPath, path.join(
              'widgets',
              attributes.providerId,
              attributes.instanceIdentifier || attributes.instanceId
            ))
          )
        }
      }

      if (themeWidgetsCustom) {
        const answers = await this.prompt([
          {
            type:    'checkbox',
            name:    'customWidgetIds',
            message: 'Select custom widgets that you want to add to this project (usually custom'
              + ' widgets are saved as separate repositories)',
            choices: [
              ...themeWidgetsCustom.map(widget => ({
                name:  widget._attributes.name,
                value: widget._attributes.instanceIdentifier || widget._attributes.instanceId,
              })),
              { name: '( ) ( ) ( ) ( )', value: '0', disabled: ' ' },
            ],
          },
        ])

        // todo: actually save custom widgets
      }
    }

    return null
  }

  // creates widget directory
  _ifCreateStaticPath (name) {
    const safeName = widgetSafeName(name)
    return ifCreatePath(this.destinationPath(), `src/${safeName}/statics`)
  }

  _copyTemplates () {
    const { mode } = this.answers

    if (mode === 'new-xml') {
      this._copyWithRename('', '', [
        ['gulpfile.js', 'gulpfile.js'],
        ['nvmrc-template', '.nvmrc'],
        ['npmrc-template', '.npmrc'],
        ['eslintrc-template', '.eslintrc'],
        ['gitignore-template', '.gitignore'],
      ])

      this._copyFiles('build-scripts/gulp', 'build-scripts/gulp', ['main.js'])
      this._copyFiles('build-scripts', 'build-scripts', ['getThemesProjectInfo.js'])
      // this._copyFiles('verint', 'verint', ['README.md'])

      this._copyFiles('../../../src', 'build-scripts', [
        'constants/',
        'utils.js',
        'filesystem.js',
        'xml.js',
      ])
    }
  }
}
