module.exports = function widgetSafeName (name) {
  return name.toLowerCase()
    .replace(/[\s:_]/gmi, '-')
    .replace(/--+/gmi, '-')
    .replace(/[${}]/gmi, '')
}