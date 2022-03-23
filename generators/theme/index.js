const BaseGenerator = require('../../src/BaseGenerator')
const fs = require('fs')
const path = require('path')

module.exports = class VerintTheme extends BaseGenerator {
  initializing () {
    this._sayHello()
    this._verifyEnvironment()

    this.inputData = {
      themeConfigs: [],
      existingPackageJson: this._getExistingPackageJson()
    }
  }
}