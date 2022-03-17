const { series } = require('gulp')

const { buildInternalXml, buildBundleXml } = require('./build-scripts/gulp/main')
const { webpackDev, webpackProd } = require('./build-scripts/gulp/react')

exports.buildReactProd = series(webpackProd, buildInternalXml, buildBundleXml)
exports.buildReactDev = series(webpackDev, buildInternalXml, buildBundleXml)
exports.buildInternal = series(webpackDev, buildInternalXml)
