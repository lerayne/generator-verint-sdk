const BaseGenerator = require('../../src/BaseGenerator')

module.exports = class VerintWidgetReact extends BaseGenerator {
  constructor (args, opts, features) {
    super(args, opts, features)
  }

  initializing () {
    this._sayHello()
    this._verifyEnvironment()
  }
}