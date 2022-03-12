/*
given with a file name (eg contentScript.vm) and file contents
outputs an object of a form:
{
  contentScript: {
    _cdata: '...', //(file contents)
    _attributes: {
      language: 'Velocity'
    }
  }
}

this object partial is assumed to be mixed into a resulting object by
{ ...resultingObject, ...partial }
*/


module.exports = function createStaticFileObjectPart (fileName, fileContents) {
  const [xmlEntryName, fileExtension] = fileName.split('.')

  let language = null
  if (fileExtension.toLowerCase() === 'vm') { language = 'Velocity' }
  if (fileExtension.toLowerCase() === 'js') { language = 'JavaScript' }

  return {
    [xmlEntryName]: {
      _attributes: language ? { 'language': language } : null,
      _cdata: fileContents
    }
  }
}