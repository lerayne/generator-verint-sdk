const Generator = require('yeoman-generator')
const fs = require('fs')
const exec = require('sync-exec')

module.exports = class BaseGenerator extends Generator {
  _sayHello(){
    const packageJson = JSON.parse(fs.readFileSync(this.templatePath('../../../package.json')))
    this.log('HELLO! You are using generator-verint-sdk v' + packageJson.version)
  }

  _verifyEnvironment() {
    let nodeVersion = exec('node --version')
    let npmVersion = exec('npm --version')

    if (nodeVersion.stderr || npmVersion.stderr) {
      this.log.error('node.js and/or NPM is not installed')
      this.log.error(nodeVersion.stderr.trim())
      this.log.error(npmVersion.stderr.trim())
      process.exit(-1)
    }
  }
}