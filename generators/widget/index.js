const BaseGenerator = require('../../src/BaseGenerator')
const fs = require('fs')
const path = require('path')
const execa = require('execa')
const { v4: uuidv4 } = require('uuid')

const {
  getXmlMainSections,
  writeNewXML,
  createStaticFileObjectPart,
  getFileExtension
} = require('../../src/xml')
const { ifCreateDir, ifCreatePath } = require('../../src/filesystem')
const { widgetSafeName, getLastModified, base64toText } = require('../../src/utils')

const validateProjectName = require('../../src/validators/validateProjectName')
const validateEmail = require('../../src/validators/validateEmail')

module.exports = class VerintWidget extends BaseGenerator {
  initializing () {
    this._sayHello()
    this._verifyEnvironment()

    let existingPackageJson = {}
    if (fs.existsSync(this.destinationPath('package.json'))) {
      existingPackageJson = JSON.parse(fs.readFileSync(this.destinationPath('package.json')))
    }

    this.inputData = {
      widgetConfigs: [],
      existingPackageJson
    }
  }

  async prompting () {
    const pathChunks = this.env.cwd.split('/')
    const folderName = pathChunks[pathChunks.length - 1]

    const userName = await execa.command('git config --get user.name')
    const userEmail = await execa.command('git config --get user.email')

    let scaffolded = this.inputData.existingPackageJson.keywords
      && this.inputData.existingPackageJson.keywords.includes('scaffolded')

    if (scaffolded) scaffolded = 'Disabled: Project is already scaffolded'

    this.answers = await this.prompt([
      // Selection of create new/convert from XML
      {
        type: 'list',
        name: 'mode',
        message: 'Is it a new widget or a conversion of an existing one?',
        choices: [
          { name: 'Create a new widget project from scratch', value: 'new', disabled: scaffolded },
          { name: 'Create a new widget project from existing XML', value: 'convert', disabled: scaffolded },
          { name: 'Add a widget to an existing project', value: 'add' },
        ],
        default: 'new'
      },

      // "NEW" ONLY OPTIONS

      // Verint version selection
      {
        type: 'list',
        name: 'verintVersion',
        message: 'Select Verint platform version',
        //only new: if adding existing version will be taken from an existing one
        choices: [
          { name: 'Verint 12', value: 12 },
          { name: 'Verint 11', value: 11 }
        ],
        when: answers => answers.mode === 'new'
      },

      // "CONVERT" ONLY OPTIONS

      // Selection of XML file
      {
        type: 'list',
        name: 'filePath',
        message: 'Select an XML file',
        choices: this._getXmlFilesChoices.bind(this),
        when: answers => answers.mode === 'convert',
      },

      // "NEW" OR "CONVERT" OPTIONS

      // Project name
      {
        type: 'input',
        name: 'projectName',
        message: 'Enter project name',
        validate: validateProjectName.bind(this),
        default: folderName,
        when: answers => ['new', 'convert'].includes(answers.mode),
      },

      // TODO: add validators to the rest of input options
      // Author name for package.json
      {
        type: 'input',
        name: 'userName',
        message: 'Project author name',
        default: userName.stdout,
        when: answers => ['new', 'convert'].includes(answers.mode),
      },

      // Author email for package.json
      {
        type: 'input',
        name: 'userEmail',
        message: 'Project author email',
        default: userEmail.stdout,
        validate: validateEmail.bind(this),
        when: answers => ['new', 'convert'].includes(answers.mode),
      },

      // "NEW" OR "ADD" PROJECT OPTIONS

      // Widget name
      {
        type: 'input',
        name: 'widgetName',
        message: 'Name of a widget (human readable)',
        default: folderName,
        validate: this._validateWidgetName.bind(this),
        when: answers => ['new', 'add'].includes(answers.mode),
      },

      // React or not
      {
        type: 'list',
        name: 'framework',
        message: 'Do you want to use a JS framework?',
        when: answers => {
          // When adding a new widget to existing config - we can add a non-react widget to react
          // project, but not the vice-versa. So if there is an existing project, and it's not a
          // React project - we don't have an option to add a React widget to it
          if (
            answers.mode === 'add'
            && this.inputData.existingPackageJson.keywords
            && !this.inputData.existingPackageJson.keywords.includes('react')
          ) return false

          return ['new', 'add'].includes(answers.mode)
        },
        choices: [
          { name: 'None', value: false },
          { name: 'React', value: 'react' }
        ],
        default: false
      },

      // Standard source files list
      {
        type: 'checkbox',
        name: 'staticFiles',
        message: 'Select the additional files you need for this widget ' +
          '(leave as is if you\'re not sure)',
        choices: answers => {
          const staticFiles = [
            { value: 'additionalCssScript.vm', checked: false },
            { value: 'headerScript.vm', checked: false },
            { value: 'languageResources.xml', checked: true },
          ]

          //if framework is React - configuration is not optional, it's always added
          if (answers.framework !== 'react') {
            staticFiles.push({ value: 'configuration.xml', checked: true },)
          }

          return staticFiles
        },
        when: answers => ['new', 'add'].includes(answers.mode)
      },

      // Configure small features
      {
        type: 'list',
        name: 'configureNow',
        message: 'Do you want to configure widget properties now (caching etc)?',
        choices: [
          { name: 'No', value: false },
          { name: 'Yes', value: true }
        ],
        default: false,
        when: answers => ['new', 'add'].includes(answers.mode)
      },

      // Description
      {
        type: 'input',
        name: 'widgetDescription',
        message: 'Widget description',
        default: '',
        when: answers => answers.configureNow,
      },

      // Checkbox-style small features
      {
        type: 'checkbox',
        name: 'widgetConfig',
        message: 'Check the necessary options:',
        choices: [
          { name: 'Show Header by Default', value: 'showHeaderByDefault', checked: true },
          { name: 'Is Cacheable', value: 'isCacheable' },
          { name: 'Vary Cache by User', value: 'varyCacheByUser' },
        ],
        default: ['showHeaderByDefault'],
        when: answers => answers.configureNow,
      },

      // CSS class name
      {
        type: 'input',
        name: 'cssClass',
        message: 'CSS Class Name',
        default: '',
        when: answers => answers.configureNow,
      },

      // Suggesting of old XML deletion
      /*{
        type: 'confirm',
        name: 'deleteXML',
        message: 'Do you want to delete the XML file after the import?',
        when: answers => answers.mode === 'convert',
        default: false
      }*/
    ])
  }

  async configuring () {
    const {
      projectName,
      mode,
      userName,
      userEmail,
      filePath,
      widgetName,
      configureNow,
      verintVersion,
      widgetDescription,
      widgetConfig,
      cssClass,
      staticFiles,
      framework
    } = this.answers

    //only on "new" or "convert"
    if (mode !== 'add') {
      // reading template of package.json
      const packageJson = JSON.parse(fs.readFileSync(
        this.templatePath(framework === 'react' ? 'package-react.json' : 'package.json')
      ))

      this.packageJson.merge(packageJson)

      //adding data to package.json
      this.packageJson.merge({
        name: projectName,
        author: `${userName} <${userEmail}>`
      })
    }

    // getting base widget configs from template/given file
    this.inputData.widgetConfigs = getXmlMainSections(
      mode === 'convert'
        ? this.destinationPath(filePath)
        : this.templatePath('bundle-template.xml')
    )

    if (['new', 'add'].includes(mode)) {
      // 1) Set attributes
      let widgetXmlObject = this.inputData.widgetConfigs[0]

      widgetXmlObject._attributes = {
        ...widgetXmlObject._attributes,
        name: widgetName,
        version: verintVersion,
        instanceIdentifier: uuidv4().replace(/-/g, ''),
        lastModified: getLastModified()
      }

      // if "configureNow" - overwrite small features with input values. Otherwise - leave values
      // from sample XML file
      if (configureNow) {
        widgetXmlObject._attributes = {
          ...widgetXmlObject._attributes,
          description: widgetDescription,
          isCacheable: widgetConfig && widgetConfig.includes('isCacheable').toString(),
          varyCacheByUser: widgetConfig && widgetConfig.includes('varyCacheByUser').toString(),
          showHeaderByDefault: widgetConfig && widgetConfig.includes('showHeaderByDefault').toString(),
          cssClass: cssClass,
        }
      }

      // 2) create static files
      // in react scenario contentScript.vm.ejs and configuration.xml are created later
      const finalStaticFiles = framework === 'react'
        ? staticFiles
        : ['contentScript.vm.ejs', ...staticFiles]

      finalStaticFiles.forEach(fileName => {
        const filePartial = createStaticFileObjectPart(fileName, '')
        widgetXmlObject = { ...widgetXmlObject, ...filePartial }
      })

      this.inputData.widgetConfigs[0] = widgetXmlObject
    }
  }

  async writing () {
    const { framework, mode, widgetName } = this.answers

    // these files don't have to be copied once again if we're adding a widget to existing project
    if (['new', 'convert'].includes(mode)) {
      this._copyWithRename('', '', [
        [(framework === 'react' ? 'gulpfile-react.js' : 'gulpfile.js'), 'gulpfile.js'],
        ['nvmrc-template', '.nvmrc'],
        ['npmrc-template', '.npmrc'],
        ['gitignore-template', '.gitignore'],
      ])

      this._copyFiles('build-scripts/gulp', 'build-scripts/gulp', ['main.js'])
      this._copyFiles('build-scripts', 'build-scripts', ['getProjectInfo.js'])
      this._copyFiles('verint', 'verint', ['README.md'])

      if (framework === 'react') {
        this._copyFiles('build-scripts/gulp', 'build-scripts/gulp', ['react.js'])
        this._copyFiles('', '', ['webpack.config.js'])
      }

      this._copyFiles('../../../src', 'build-scripts', [
        'utils.js',
        'filesystem.js',
        'xml.js',
      ])
    }

    // these have "if not exists" inside, so OK
    ifCreatePath(this.destinationPath(), 'verint/filestorage/defaultwidgets')
    const widgetsPath = this.destinationPath('verint/filestorage/defaultwidgets')

    await Promise.all(this.inputData.widgetConfigs.map(config => {
      return this._processWidgetDefinition(config, widgetsPath)
    }))

    if (framework === 'react' && ['new', 'add'].includes(mode)) {
      const safeName = widgetSafeName(widgetName)

      this._copyFiles('src/shared/utils', 'src/shared/utils', [
        'asyncUtils.js',
        'converter.js',
        'verintEnv.js',
        'verintNetwork.js',
      ])
      this._copyFiles('src', 'src/' + safeName, [
        'components-configuration/',
        'components-view/',
        'constants/',
        'statics/configuration.xml',
        'configuration.js',
        'view.js',
      ])

      const targetWidgetPath =
        'verint/filestorage/defaultwidgets/00000000000000000000000000000000/'
        + this.inputData.widgetConfigs[0]._attributes.instanceIdentifier

      this._copyFiles('verint', targetWidgetPath, ['configuration-helpers.vm'])

      this.fs.copyTpl(
        this.templatePath('verint/configuration.vm.ejs'),
        this.destinationPath(targetWidgetPath + '/configuration.vm'),
        { widgetSafeName: safeName }
      )

      this.fs.copyTpl(
        this.templatePath('src/statics/contentScript.vm.ejs'),
        this.destinationPath(`src/${safeName}/statics/contentScript.vm`),
        { widgetSafeName: safeName }
      )
    }

    /*if (this.answers.deleteXML) {
      this.fs.delete(this.destinationPath(this.answers.filePath))
    }*/
  }

  end () {
    this.log('FINISHED!')
  }

  /**
   * Writes a widget file structure to disc
   *
   * @param widgetXmlObject
   * @param widgetsPath
   * @returns {Promise<null>}
   * @private
   */
  async _processWidgetDefinition (widgetXmlObject, widgetsPath) {
    const { _attributes } = widgetXmlObject

    //defining provider id and final path
    const providerId = _attributes.providerId || '00000000000000000000000000000000'
    const providerPath = path.join(widgetsPath, providerId)

    //make this path if needed
    await ifCreateDir(providerPath)

    // widget main id that is also file and folder name in Verint's FS
    const widgetInstanceId = _attributes.instanceIdentifier || _attributes.instanceId

    //create "clean" XML w/o attachments for Verint's FS
    const widgetXmlObjectInternal = {}
    Object.keys(widgetXmlObject).forEach(recordName => {
      if (recordName !== 'files') {
        widgetXmlObjectInternal[recordName] = widgetXmlObject[recordName]
      }
    })

    //write Verint's internal XML widget definition
    await writeNewXML(widgetXmlObjectInternal, path.join(providerPath, widgetInstanceId + '.xml'))

    // create attachments dir - even if there's no attachments yet - developer might need it later
    const attachmentsPath = path.join(providerPath, widgetInstanceId)
    await ifCreateDir(attachmentsPath)

    // save attachment files to Verint's internal folder
    const xmlObjectFields = Object.keys(widgetXmlObject)

    xmlObjectFields.forEach(key => {
      const recordData = widgetXmlObject[key]

      if (key === 'files' && recordData.file) {
        //single entry is not parsed as array, so we make it an array
        if (recordData.file.length === undefined) recordData.file = [recordData.file]

        recordData.file.forEach(file => {
          fs.writeFileSync(
            path.join(attachmentsPath, file._attributes.name),
            base64toText(file._cdata || file._text || '')
          )
        })
      }
    })

    await ifCreateDir(this.destinationPath('src'))

    // create "widget safe name" in folder in src
    const safeName = widgetSafeName(_attributes.name)
    const srcPath = this.destinationPath('src/' + safeName)
    await ifCreateDir(srcPath)

    //create "main widget files" in src/statics
    const staticPath = this.destinationPath(`src/${safeName}/statics`)
    await ifCreateDir(staticPath)

    for (let k = 0; k < xmlObjectFields.length; k++) {
      const key = xmlObjectFields[k]
      if (key !== '_attributes' && key !== 'files') {
        const recordData = widgetXmlObject[key]
        const newFileName = key + getFileExtension(recordData, '.xml')

        fs.writeFileSync(
          this.destinationPath(`src/${safeName}/statics/${newFileName}`),
          recordData._cdata ? recordData._cdata.trim() : recordData._text ? recordData._text.trim() : ''
        )
      }
    }

    return null
  }

  _copyFiles (fromFolder, toFolder, files) {
    if (fromFolder) fromFolder += '/'
    if (toFolder) toFolder += '/'

    files.forEach(file => {
      this.fs.copy(
        this.templatePath(fromFolder + file),
        this.destinationPath(toFolder + file)
      )
    })
  }

  _copyWithRename (fromFolder, toFolder, namePairs) {
    if (fromFolder) fromFolder += '/'
    if (toFolder) toFolder += '/'

    namePairs.forEach(pair => {
      this.fs.copy(
        this.templatePath(fromFolder + pair[0]),
        this.destinationPath(toFolder + pair[1])
      )
    })
  }

  /**
   * For prompting option - provides a list of XML files that can be used for conversion
   *
   * @returns {string[]}
   * @private
   */
  _getXmlFilesChoices () {
    //read root folder
    let files = fs.readdirSync(this.destinationPath())

    //if exists - read "import" folder
    if (fs.existsSync(this.destinationPath('import'))) {
      const files2 = fs.readdirSync(this.destinationPath('import'))
      files = files.concat(files2.map(fName => 'import/' + fName))
    }

    //find xml files
    const xmls = files.filter(fName => fName.match(/\.xml$/i))

    if (!xmls.length) {
      this.log.error('XML files not found. It should be in root or "import" directory')
      process.exit(-1)
    }

    return xmls
  }

  _validateWidgetName (value, answers) {
    let passed = true

    if (!value) {
      this.log.error('\nERROR: project name is required')
      passed = false
    }

    if (value.match(/^\s*$/)) {
      this.log.error('\nERROR: project name should contain something')
      passed = false
    }

    if (answers.mode === 'add') {
      const newSafeName = widgetSafeName(value)

      const existingNames = fs.readdirSync(this.destinationPath('src'))

      if (existingNames.includes(newSafeName)) {
        this.log.error('\nERROR: a widget with this name already exists')
        passed = false
      }
    }

    return passed
  }
}
