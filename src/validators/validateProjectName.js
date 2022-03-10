module.exports = function validateProjectName (value) {
  let passed = true

  if (!value) {
    this.log.error('\nERROR: project name is required')
    passed = false
  }

  if (value.match(/\s/g)) {
    this.log.error('\nERROR: project name should not contain whitespace symbols')
    passed = false
  }

  if (value.match(/^\d+$/)) {
    this.log.error('\nERROR: project name should contain at least one letter')
    passed = false
  }

  return passed
}