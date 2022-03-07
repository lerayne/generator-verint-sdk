const BaseGenerator = require('../../src/BaseGenerator')
const fs = require('fs')

module.exports = class VerintWidget extends BaseGenerator {
  constructor (args, opts, features) {
    super(args, opts, features)
  }

  initializing () {
    this._sayHello()
    this._verifyEnvironment()
  }

  prompting () {
    return this.prompt([
      {
        type: 'list',
        name: 'newOrConvert',
        message: 'Is it a new widget or a conversion of an existing one?',
        choices: [
          {name: 'Create new', value: 'new'},
          {name: 'Convert existing XML', value: 'convert'}
        ],
        default: 'new'
      }, {
        type: 'list',
        name: 'fileName',
        message: 'Select an XML file',
        when: answers => {
          return answers.newOrConvert === 'convert'
        },
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
      }
    ])
  }
}