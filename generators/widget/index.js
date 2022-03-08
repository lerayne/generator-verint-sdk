const BaseGenerator = require('../../src/BaseGenerator')
const fs = require('fs')
const path = require('path')
const execa = require('execa')

const { getXMLContents } = require('../../src/importXML')
const ifCreateDir = require('../../src/ifCreateDir')
const writeNewXML = require('../../src/writeNewXML')
const { base64toText } = require('../../src/base64')
const widgetSafeName = require('../../src/widgetSafeName')
const getFileExtension = require('../../src/getFileExtension')

module.exports = class VerintWidget extends BaseGenerator {
  initializing () {
    this._sayHello()
    this._verifyEnvironment()

    this.inputData = {
      widgetConfigs: []
    }
  }

  async prompting () {
    const pathChunks = this.env.cwd.split('/')
    const folderName = pathChunks[pathChunks.length - 1]

    const userName = await execa.command('git config --get user.name')
    const userEmail = await execa.command('git config --get user.email')

    this.answers = await this.prompt([
      {
        type: 'input',
        name: 'projectName',
        message: 'Enter project name',
        validate: value => {
          let passed = true

          if (!value) {
            this.log.error('\nERROR: tile system name is required')
            passed = false
          }

          if (value.match(/\s/g)) {
            this.log.error('\nERROR: tile name should not contain whitespace symbols')
            passed = false
          }

          if (value.match(/^\d+$/)) {
            this.log.error('\nERROR: tile name should contain at least one letter')
            passed = false
          }

          return passed
        },
        default: folderName
      },
      {
        type: 'input',
        name: 'userName',
        message: 'Project author name',
        default: userName.stdout,
      },
      {
        type: 'input',
        name: 'userEmail',
        message: 'Project author email',
        default: userEmail.stdout,
        validate: value => {
          let passed = true

          if (value.match(/\s/g)) {
            this.log.error('\nERROR: email should not contain whitespace symbols')
            passed = false
          }

          return passed
        }
      },
      {
        type: 'list',
        name: 'newOrConvert',
        message: 'Is it a new widget or a conversion of an existing one?',
        choices: [
          { name: 'Create new', value: 'new' },
          { name: 'Convert existing XML', value: 'convert' }
        ],
        default: 'new'
      }, {
        type: 'list',
        name: 'filePath',
        message: 'Select an XML file',
        when: answers => answers.newOrConvert === 'convert',
        choices: () => {
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
      },
      /*{
        type: 'confirm',
        name: 'deleteXML',
        message: 'Do you want to delete the XML file after the import?',
        when: answers => answers.newOrConvert === 'convert',
        default: false
      }*/
    ])
  }

  async configuring () {
    const packageJson = JSON.parse(fs.readFileSync(this.templatePath('package.json')))

    this.packageJson.merge(packageJson)

    this.packageJson.merge({
      name: this.answers.projectName,
      author: `${this.answers.userName} <${this.answers.userEmail}>`
    })

    if (this.answers.newOrConvert === 'convert') {
      const xmlFileContents = getXMLContents(this.destinationPath(this.answers.filePath))

      if (
        //todo: check if there's more to be found somewhere in this path
        xmlFileContents
        && xmlFileContents.scriptedContentFragments
        && xmlFileContents.scriptedContentFragments.scriptedContentFragment
      ) {
        const mainSection = xmlFileContents.scriptedContentFragments.scriptedContentFragment

        this.inputData.widgetConfigs = Array.isArray(mainSection) ? mainSection : [mainSection]
      }
    }
  }

  async writing () {
    await ifCreateDir(this.destinationPath('verint'))
    await ifCreateDir(this.destinationPath('verint/filestorage'))
    await ifCreateDir(this.destinationPath('verint/filestorage/defaultwidgets'))

    this._copyWithRename('', '', [
      ['nvmrc-template', '.nvmrc'],
      ['npmrc-template', '.npmrc'],
      ['gitignore-template', '.gitignore'],
    ])

    this._copyFiles('', '', ['gulpfile.js'])
    this._copyFiles('build-scripts/gulp', 'build-scripts/gulp', ['main.js'])
    this._copyFiles('build-scripts', 'build-scripts', ['getProjectInfo.js'])
    this._copyFiles('verint', 'verint', ['README.md'])

    this._copyFiles('../../../src', 'build-scripts', [
      'base64.js',
      'widgetSafeName.js',
      'ifCreateDir.js',
      'writeNewXML.js',
      'importXML.js'
    ])

    const widgetsPath = this.destinationPath('verint/filestorage/defaultwidgets')

    await Promise.all(this.inputData.widgetConfigs.map(config => {
      return this._processWidgetDefinition(config, widgetsPath)
    }))

    /*if (this.answers.deleteXML) {
      this.fs.delete(this.destinationPath(this.answers.filePath))
    }*/
  }

  install () {
    if (!this.options['skip-install']) { //standard cli command --skip-install
      this.log('Installing dependencies'.toUpperCase())
    }
  }

  end () {
    this.log('FINISHED!')
  }

  async _processWidgetDefinition (widgetDefinition, widgetsPath) {
    const widgetProps = widgetDefinition._attributes

    //defining provider id and final path
    const providerId = widgetProps.providerId || '00000000000000000000000000000000'
    const providerPath = path.join(widgetsPath, providerId)

    //make this path if needed
    await ifCreateDir(providerPath)

    // widget main id that is also file and folder name in Verint's FS
    const widgetInstanceId = widgetProps.instanceIdentifier || widgetProps.instanceId

    //create "clean" XML w/o attachments for Verint's FS
    const widgetInternalXml = {}
    Object.keys(widgetDefinition).forEach(recordName => {
      if (recordName !== 'files') {
        widgetInternalXml[recordName] = widgetDefinition[recordName]
      }
    })

    //write Verint's internal XML widget definition
    await writeNewXML(widgetInternalXml, path.join(providerPath, widgetInstanceId + '.xml'))

    // save attachment files to internal XML widget
    const definitionKeys = Object.keys(widgetDefinition)
    for (let i = 0; i < definitionKeys.length; i++) {
      const key = definitionKeys[i]
      const recordData = widgetDefinition[key]

      // find "files" section
      if (key === 'files' && recordData.file) {
        //single entry is not parsed as array, so we make it an array
        if (recordData.file.length === undefined) {
          recordData.file = [recordData.file]
        }

        const attachmentsPath = path.join(providerPath, widgetInstanceId)
        await ifCreateDir(attachmentsPath)

        //for each found file - decrypt it from base64 and save to folder
        for (let j = 0; j < recordData.file.length; j++) {
          const file = recordData.file[j]

          await fs.promises.writeFile(
            path.join(attachmentsPath, file._attributes.name),
            base64toText(file._cdata || file._text || '')
          )
        }
      }
    }

    await ifCreateDir(this.destinationPath('src'))

    // create "widget safe name" in folder in src
    const safeName = widgetSafeName(widgetProps.name)
    const srcPath = this.destinationPath('src/' + safeName)
    await ifCreateDir(srcPath)

    //create "main widget files" in src/statics
    const staticPath = this.destinationPath(`src/${safeName}/statics`)
    await ifCreateDir(staticPath)

    for (let k = 0; k < definitionKeys.length; k++) {
      const key = definitionKeys[k]
      if (key !== '_attributes' && key !== 'files') {
        const recordData = widgetDefinition[key]
        const newFileName = key + getFileExtension(recordData, '.xml')

        await fs.promises.writeFile(
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
}