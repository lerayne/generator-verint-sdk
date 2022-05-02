const { series } = require('gulp')

const { buildInternalXmls, buildBundleXmls } = require('./build-scripts/gulp/main')

exports.buildSimpleBundle = series(buildInternalXmls, buildBundleXmls)
exports.buildSimpleInternal = buildInternalXmls
