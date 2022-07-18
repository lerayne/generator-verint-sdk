// eslint-disable-next-line import/no-unused-modules
const themeTypeIds = {
  site:  '0c647246673542f9875dc8b991fe739b',
  group: 'c6108064af6511ddb074de1a56d89593',
  blog:  'a3b17ab0af5f11dda3501fcf55d89593',
}

const themeTypeFolders = {
  site:  's',
  group: 'g',
  blog:  'b',
}

const themeStaticFiles = {
  headScript:        'headScript.vm',
  bodyScript:        'bodyScript.vm',
  configuration:     'configuration.xml',
  paletteTypes:      'paletteTypes.xml',
  languageResources: 'languageResources.xml',
}

const widgetStaticFiles = {
  additionalCssScript: 'additionalCssScript.vm',
  configuration:       'configuration.xml',
  contentScript:       'contentScript.vm',
  headerScript:        'headerScript.vm',
  languageResources:   'languageResources.xml',
}

const embedStaticFiles = {
  configuration:     'configuration.xml',
  contentScript:     'contentScript.vm',
  languageResources: 'languageResources.xml',
}

module.exports = {
  themeTypeIds,
  themeTypeFolders,
  themeStaticFiles,
  widgetStaticFiles,
  embedStaticFiles,
}