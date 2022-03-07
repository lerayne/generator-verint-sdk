function textToBase64 (text) {
  return Buffer.from(text).toString('base64')
}

function base64toText (base64text) {
  return Buffer.from(base64text, 'base64').toString('ascii')
}

module.exports = {
  textToBase64,
  base64toText
}