// eslint-disable-next-line import/no-unused-modules
module.exports = function validateEmail (value) {
  let passed = true

  if (value.match(/\s/gu)) {
    this.log.error('\nERROR: email should not contain whitespace symbols')
    passed = false
  }

  return passed
}
