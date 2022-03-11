const { series } = require('gulp')

const {
  webpackDev, webpackProd, buildInternalXml, buildBundleXml
} = require('./build-scripts/gulp/main')

exports.buildReactProd = series(webpackProd, buildInternalXml, buildBundleXml)
exports.buildReactDev = series(webpackDev, buildInternalXml, buildBundleXml)
exports.buildInternal = series(webpackDev, buildInternalXml)
