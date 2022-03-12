const moment = require('moment')

module.exports = function getLastModified () {
  moment().utc().format('YYYY-MM-DD H:mm:ss') + 'Z'
}