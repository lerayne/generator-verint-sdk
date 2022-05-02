const { src } = require('gulp')
const shell = require('gulp-shell')

exports.webpackProd = function webpackProd () {
  return src('./', { read: false }).pipe(
    shell('webpack --progress --mode=production --env mode=production')
  )
}

exports.webpackDev = function webpackDev () {
  return src('./', { read: false }).pipe(
    shell('webpack --progress --mode=development --env mode=development')
  )
}
