// eslint-disable-next-line import/no-unused-modules
const { series } = require('gulp')

const { buildInternalXml, buildBundleXml } = require('./build-scripts/gulp/main')

exports.buildSimpleBundle = series(buildInternalXml, buildBundleXml)
exports.buildSimpleInternal = buildInternalXml
