// eslint-disable-next-line import/no-unused-modules
const fs = require('fs')
const path = require('path')

const execa = require('execa')
const { v4: uuidv4 } = require('uuid')

const BaseGenerator = require('../../src/BaseGenerator')
const validateProjectName = require('../../src/validators/validateProjectName')
const validateEmail = require('../../src/validators/validateEmail')
const { getXmlEmbeddable, createStaticFileObjectPart, writeNewEmbedXML } = require('../../src/xml')
const { getLastModified, widgetSafeName } = require('../../src/utils')
const { ifCreatePath } = require('../../src/filesystem')
const { PATH_EMBEDDABLES } = require('../../src/constants/paths')
const { writeAttachments, writeStatics } = require('../../src/filesystem-generator')
const { embedStaticFiles } = require('../../src/constants/global')

module.exports = class VerintEmbeddable extends BaseGenerator {
  initializing () {
    this._sayHello()
    this._verifyEnvironment()

    this.inputData = {
      embedConfig:         {},
      existingPackageJson: this._getExistingPackageJson(),
    }
  }

  // eslint-disable-next-line max-lines-per-function
  async prompting () {
    // getting current folder name
    const pathChunks = this.env.cwd.split(path.sep)
    const folderName = pathChunks[pathChunks.length - 1]

    const userName = await execa.command('git config --get user.name')
    const userEmail = await execa.command('git config --get user.email')

    const scaffolded = this.inputData.existingPackageJson.keywords
      && this.inputData.existingPackageJson.keywords.includes('scaffolded')

    if (scaffolded) {
      this.log.error('Project is already scaffolded')
      process.exit(-1)
    }

    this.answers = await this.prompt([
      {
        'type':    'list',
        'name':    'mode',
        'message': 'Is it a new embeddable or a conversion of an existing one?',
        'choices': [
          {
            name:  'Create a new embeddable project from scratch',
            value: 'new',
          }, {
            name:  'Create a new embeddable project from existing XML',
            value: 'convert',
          },
        ],
        'default': 'new',
      },

      // Selection of XML file
      {
        type:    'list',
        name:    'filePath',
        message: 'Select an XML file',
        choices: this._getXmlFilesChoices.bind(this),
        when:    answers => answers.mode === 'convert',
      },

      // Project name
      {
        'type':     'input',
        'name':     'projectName',
        'message':  'Enter project name',
        'validate': validateProjectName.bind(this),
        'default':  folderName,
        'when':     answers => ['new', 'convert'].includes(answers.mode),
      },

      // Author name for package.json
      {
        'type':    'input',
        'name':    'userName',
        'message': 'Project author name',
        'default': userName.stdout,
        'when':    answers => ['new', 'convert'].includes(answers.mode),
      },

      // Author email for package.json
      {
        'type':     'input',
        'name':     'userEmail',
        'message':  'Project author email',
        'default':  userEmail.stdout,
        'validate': validateEmail.bind(this),
        'when':     answers => ['new', 'convert'].includes(answers.mode),
      },

      // Embeddable name
      {
        'type':     'input',
        'name':     'embedName',
        'message':  'Name of an embeddable (human readable)',
        'default':  folderName,
        'validate': this._validateEmbedName.bind(this),
        'when':     answers => ['new', 'add'].includes(answers.mode),
      },

      // React or not.
      // Not available if converting
      {
        'type':    'list',
        'name':    'framework',
        'message': 'Do you want to use a JS framework?',
        'when':    answers => ['new'].includes(answers.mode),
        'choices': [
          { name: 'None', value: false },
          { name: 'React', value: 'react' },
        ],
        'default': false,
      },

      // Configure small features
      {
        'type':    'list',
        'name':    'configureNow',
        'message': 'Do you want to configure embeddable properties now (caching etc)?',
        'choices': [
          { name: 'No', value: false },
          { name: 'Yes', value: true },
        ],
        'default': false,
        'when':    answers => ['new'].includes(answers.mode),
      },

      // Description
      {
        'type':    'input',
        'name':    'embedDescription',
        'message': 'Embeddable description',
        'default': '',
        'when':    answers => answers.configureNow,
      },

      // Checkbox-style small features
      {
        'type':    'checkbox',
        'name':    'embedConfig',
        'message': 'Check the necessary options:',
        'choices': [
          { name: 'Is Cacheable', value: 'isCacheable' },
          { name: 'Vary Cache by User', value: 'varyCacheByUser' },
        ],
        'default': ['showHeaderByDefault'],
        'when':    answers => answers.configureNow,
      },

      // embed category
      {
        'type':    'input',
        'name':    'embedCategory',
        'message': 'Do you want to categorize this embeddable? (leave empty if you don\'t)',
        'default': '',
        'when':    answers => answers.configureNow,
      },

      // todo: embed restriction by RTE type
      // types are expressed as UUIDs. Are they the same for every instance?
    ])
  }

  configuring () {
    const {
      mode,
      framework,
      projectName,
      userName,
      userEmail,
      filePath,
      embedName,
      configureNow,
      embedConfig,
      embedCategory,
    } = this.answers

    // only on "new" or "convert"
    if (['new', 'convert'].includes(mode)) {
      // reading template of package.json
      const packageJson = JSON.parse(fs.readFileSync(
        this.templatePath(framework === 'react' ? 'package-react.json' : 'package.json')
      ))

      this.packageJson.merge(packageJson)

      // adding data to package.json
      this.packageJson.merge({
        name:   projectName,
        author: `${userName} <${userEmail}>`,
      })
    }

    // getting base embeddable config from template/given file
    this.inputData.embedConfig = getXmlEmbeddable(
      mode === 'convert'
        ? this.destinationPath(filePath)
        : this.templatePath('bundle-template.xml')
    )

    if (['new'].includes(mode)) {
      // 1) Set attributes
      const embedXmlObject = this.inputData.embedConfig

      // set name, last modified date and generate new id
      embedXmlObject._attributes = {
        ...embedXmlObject._attributes,
        name:         embedName,
        id:           uuidv4().replace(/-/gu, ''),
        lastModified: getLastModified(),
      }

      // if "configureNow" - overwrite small features with input values. Otherwise - leave values
      // from sample XML file
      if (configureNow) {
        embedXmlObject._attributes = {
          ...embedXmlObject._attributes,
          isCacheable:     embedConfig && embedConfig.includes('isCacheable').toString(),
          varyCacheByUser: embedConfig && embedConfig.includes('varyCacheByUser').toString(),
          category:        embedCategory.trim(),
        }
      }

      this.inputData.embedConfig = embedXmlObject
    }
  }

  writing () {
    const { mode, framework, embedName } = this.answers

    if (['new', 'convert'].includes(mode)) {
      // root folder
      this._copyWithRename('', '', [
        [(framework === 'react' ? 'gulpfile-react.js' : 'gulpfile.js'), 'gulpfile.js'],
        ['nvmrc-template', '.nvmrc'],
        ['npmrc-template', '.npmrc'],
        ['eslintrc-template', '.eslintrc'],
        ['gitignore-template', '.gitignore'],
      ])

      this._copyFiles('build-scripts/gulp', 'build-scripts/gulp', ['main.js'])
      this._copyFiles('build-scripts', 'build-scripts', ['getProjectInfo.js'])
      this._copyFiles('verint', 'verint', ['README.md'])

      if (framework === 'react') {
        this._copyFiles('build-scripts/gulp', 'build-scripts/gulp', ['react.js'])
        this._copyFiles('', '', ['webpack.config.js'])
      }

      // utils and constants that are common for all generators and also copied to the project
      this._copyFiles('../../../src', 'build-scripts', [
        'constants/',
        'utils.js',
        'filesystem.js',
        'xml.js',
      ])
    }

    const embedsPath = ifCreatePath(this.destinationPath(), PATH_EMBEDDABLES)

    // creates files and folders based on the config formed by external XML or user's choice in
    // prompt section
    this._processEmbedDefinition(this.inputData.embedConfig, embedsPath)

    if (['new'].includes(mode)) {
      if (framework !== 'react') {
        this._copyFiles('src-simple', 'src', [
          'statics/',
        ])
      } else {
        // source file templates
        this._copyFiles('src', 'src', [
          'shared/',
          'components-configuration/',
          'components-view/',
          'constants/',
          'statics/configuration.xml',
          'statics/languageResources.xml',
          'configuration.jsx',
          'view.jsx',
        ])

        const targetEmbedPath = path.join(
          PATH_EMBEDDABLES,
          '00000000000000000000000000000000',
          this.inputData.embedConfig._attributes.id
        )

        // velocity templates for react-based custom configuration
        this._copyFiles('verint', targetEmbedPath, ['configuration-helpers.vm'])

        const safeName = widgetSafeName(embedName)

        this.fs.copyTpl(
          this.templatePath('verint/configuration.vm.ejs'),
          this.destinationPath(`${targetEmbedPath}/configuration.vm`),
          { safeName }
        )

        // velocity template for react-based view
        this.fs.copyTpl(
          this.templatePath('src/statics/contentScript.vm.ejs'),
          this.destinationPath('src/statics/contentScript.vm'),
          { safeName }
        )
      }
    }
  }

  end () {
    this.log('FINISHED!')
    if (this.answers.mode === 'convert') {
      this.log(`You may now delete the source file: ${this.answers.filePath}`)
    }
  }

  _validateEmbedName (value, _answers) {
    let passed = true

    if (!value) {
      this.log.error('\nERROR: name is required')
      passed = false
    }

    if (value.match(/^\s*$/u)) {
      this.log.error('\nERROR: name should contain something')
      passed = false
    }

    return passed
  }

  async _processEmbedDefinition (embedXmlObject, embedsPath, customProviderId) {
    const { _attributes } = embedXmlObject

    // defining provider id and final path
    const providerId = (
      customProviderId
      || _attributes.providerId
      || '00000000000000000000000000000000'
    )
    const providerPath = ifCreatePath(embedsPath, providerId)

    // create "clean" XML w/o attachments for Verint's FS
    const embedXmlObjectInternal = {}
    Object.keys(embedXmlObject).forEach(recordName => {
      if (recordName !== 'files') {
        embedXmlObjectInternal[recordName] = embedXmlObject[recordName]
      }
    })

    // write Verint's internal XML widget definition
    await writeNewEmbedXML(embedXmlObjectInternal, path.join(providerPath, `${_attributes.id}.xml`))

    // create attachments dir - even if there's no attachments yet - developer might need it later
    const attachmentsPath = ifCreatePath(providerPath, _attributes.id)

    writeAttachments(embedXmlObject, 'files', attachmentsPath)

    const staticsPath = ifCreatePath(this.destinationPath(), path.join('src', 'statics'))

    writeStatics(embedXmlObject, staticsPath, embedStaticFiles)

    return null
  }
}
