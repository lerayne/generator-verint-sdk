module.exports = function validateEmail (value) {
  let passed = true

  if (value.match(/\s/g)) {
    this.log.error('\nERROR: email should not contain whitespace symbols')
    passed = false
  }

  return passed
}