// Verint file structure paths

/* THEMES */

const PATH_THEME_DEFINITIONS = 'verint/filestorage/themefiles/d'

// FD = Factory Default. Only available in developer mode, where factory default files can be
// overwritten
const PATH_THEME_FILES_FD = 'verint/filestorage/themefiles/fd'

// only exists in non-developer mode site, so most likely we don't need it
const PATH_THEME_FILES = 'verint/filestorage/themefiles/f'

// path for page layouts
const PATH_THEME_LAYOUTS = 'verint/filestorage/factorydefaultpages'

/* WIDGETS */
const PATH_WIDGET_FILES = 'verint/filestorage/defaultwidgets'

const PATH_WIDGETS = 'verint/filestorage/defaultwidgets'

const PATH_EMBEDDABLES = 'verint/filestorage/embeddables/fd'

module.exports = {
  PATH_THEME_DEFINITIONS,
  PATH_THEME_FILES_FD,
  PATH_THEME_FILES,
  PATH_WIDGET_FILES,
  PATH_WIDGETS,
  PATH_THEME_LAYOUTS,
  PATH_EMBEDDABLES,
}
