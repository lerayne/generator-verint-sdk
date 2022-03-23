const Generator = require('yeoman-generator')
const fs = require('fs')
const execa = require('execa')

module.exports = class BaseGenerator extends Generator {
  constructor (...args) {
    super(...args)
    this._getXmlFilesChoices = this._getXmlFilesChoices.bind(this)
  }

  _sayHello(){
    const packageJson = JSON.parse(fs.readFileSync(this.templatePath('../../../package.json')))
    this.log('HELLO! You are using generator-verint-sdk v' + packageJson.version)
  }

  _verifyEnvironment() {
    let nodeVersion = execa.commandSync('node --version')
    let npmVersion = execa.commandSync('npm --version')
    let gitUser = execa.commandSync('git config --get user.name')

    if (nodeVersion.stderr || npmVersion.stderr || gitUser.stderr) {
      this.log.error('Either node.js, NPM or git is not installed')
      this.log.error(nodeVersion.stderr.trim())
      this.log.error(npmVersion.stderr.trim())
      this.log.error(gitUser.stderr.trim())
      process.exit(-1)
    }
  }

  _getExistingPackageJson () {
    let existingPackageJson = {}
    if (fs.existsSync(this.destinationPath('package.json'))) {
      existingPackageJson = JSON.parse(fs.readFileSync(this.destinationPath('package.json')))
    }

    return existingPackageJson
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
