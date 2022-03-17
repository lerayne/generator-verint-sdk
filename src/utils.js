const moment = require('moment')

function getLastModified () {
  return moment().utc().format('YYYY-MM-DD H:mm:ss') + 'Z'
}

function widgetSafeName (name) {
  return name.toLowerCase()
    .replace(/[\s:_]/gmi, '-')
    .replace(/--+/gmi, '-')
    .replace(/[${}]/gmi, '')
}

function textToBase64 (text) {
  return Buffer.from(text).toString('base64')
}

function base64toText (base64text) {
  return Buffer.from(base64text, 'base64').toString('ascii')
}

module.exports = {
  getLastModified,
  widgetSafeName,
  textToBase64,
  base64toText
}