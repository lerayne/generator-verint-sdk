const Generator = require('yeoman-generator')
const fs = require('fs')
const execa = require('execa')

module.exports = class BaseGenerator extends Generator {
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
}
