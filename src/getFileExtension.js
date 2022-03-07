function getFileExtension (fileRecord, defaultExt = '') {
  const extensionMapping = {
    'Velocity': '.vm',
    'JavaScript': '.js'
  }

  if (
    fileRecord._attributes
    && fileRecord._attributes.language
    && extensionMapping[fileRecord._attributes.language]
  ) {
    return extensionMapping[fileRecord._attributes.language]
  }

  return defaultExt
}

module.exports = getFileExtension