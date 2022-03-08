const { series } = require('gulp')

const {
  buildInternalXml, buildBundleXml, importBundleToScaffold, prepareReact
} = require('./build-scripts/gulp/main')

exports.buildSimpleBundle = series(buildInternalXml, buildBundleXml)
exports.buildSimpleInternal = buildInternalXml
exports.importXML = importBundleToScaffold
