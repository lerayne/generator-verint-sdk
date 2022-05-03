/* global WIDGET_SAFE_NAME */
import deepExtend from 'deep-extend'

function jsonCopy (obj) {
  if (typeof obj !== 'object') return null
  try {
    return JSON.parse(JSON.stringify(obj))
  } catch (error) {
    console.error('Warning! Argument is not a valid JSON. Details:', error)
    return null
  }
}

function isEmpty (obj) {
  if (typeof obj !== 'object') return null
  return Object.keys(obj).length === 0
}

/**
 * Config schema conversion between revisions (supports upgrade and downgrade)
 * Schema upgrade/downgrade can require server calls so convert should be async
 * @param currentConfig - the saved config loaded from server (may be outdated)
 * @param defaultConfig
 * @param converters
 * @returns {Promise<object>}
 */
// eslint-disable-next-line default-param-last
async function convertSchema (currentConfig = {}, defaultConfig, converters) {
  // To understand whether or not we have to up/downgrade the config schema we first need to
  // get current and desired schema revision. Thing is, if config was saved prior to
  // application of this tool, it may have no explicit revision.

  // Step 1: determine the current config revision
  // if the revision is not found in config - it's assumed to be -1
  let currentRevision = -1
  if (currentConfig.meta && typeof currentConfig.meta.revision === 'number') {
    currentRevision = currentConfig.meta.revision
  }

  // Step 2: determine target config revision
  let targetRevision = -1
  if (defaultConfig.meta && typeof defaultConfig.meta.revision === 'number') {
    targetRevision = defaultConfig.meta.revision
  }

  // Step 3: determine type of conversion (none, upgrade or downgrade)
  let type // possible values: 'up' | 'down'

  if (currentRevision === targetRevision) {
    console.log(`${WIDGET_SAFE_NAME}: same schema revisions, no need to convert`)
    return currentConfig
  }

  // if converters are empty - nothing to convert
  if (!converters || !converters.length) {
    console.warn(`${WIDGET_SAFE_NAME}: schema revisions don't match, but no converters defined. Skipping conversion`)
    return currentConfig
  }

  if (targetRevision > currentRevision) {
    type = 'up'
    console.info(`${WIDGET_SAFE_NAME}: upgrading schema from`, currentRevision, 'to', targetRevision)
  }

  if (targetRevision < currentRevision) {
    type = 'down'
    console.info(`${WIDGET_SAFE_NAME}: downgrading from`, currentRevision, 'to', targetRevision)
  }

  // Step 4: queueing the converters
  const queue = []

  if (type === 'up') {
    for (let i = currentRevision + 1; i <= targetRevision; i++) {
      if (converters[i] && converters[i].upgradeTo) {
        queue.push(converters[i].upgradeTo)
      } else {
        console.warn(`${WIDGET_SAFE_NAME}: no converter, or no "upgradeTo" scenario was found for the specified revision ${i}. Skipping conversion`)
        return currentConfig
      }
    }
  }

  if (type === 'down') {
    for (let i = currentRevision; i > targetRevision; i--) {
      if (converters[i] && converters[i].downgradeFrom) {
        queue.push(converters[i].downgradeFrom)
      } else {
        console.warn(`${WIDGET_SAFE_NAME}: no converter, or no "downgradeFrom" scenario was found for the specified revision ${i}. Skipping conversion`)
        return currentConfig
      }
    }
  }

  if (queue.length === 0) {
    console.warn(`${WIDGET_SAFE_NAME}: schema revisions don't match, but no converters queued. Skipping conversion`)
    return currentConfig
  }

  if (queue.some(converter => typeof converter !== 'function')) {
    throw new Error('Converter should be a function')
  }

  let targetConfig = jsonCopy(currentConfig)

  // Step 5: step by step conversion

  for (const converter of queue) {
    // eslint-disable-next-line no-await-in-loop
    targetConfig = await converter(targetConfig)
  }

  if (!targetConfig.meta) targetConfig.meta = {}
  targetConfig.meta.revision = targetRevision

  /*
  const converter = new ConfigSchemaConverter(
      currentConfig,
      type,
      converters,
      currentRevision,
      targetRevision
  )

  // execute conversion process
  const targetConfig = await converter.exec()
  */

  return targetConfig
}

async function prepareConfig (currentConfig = {}, defaultConfig, converters) {

  // Current configuration can be empty - when tile is being configured for the first time and
  // there is no saved config at all. In this case - just return defaults
  if (!currentConfig || isEmpty(currentConfig)) return jsonCopy(defaultConfig)

  // convert schema
  let targetConfig = await convertSchema(currentConfig, defaultConfig, converters)

  // extending changes that don't need converters
  targetConfig = deepExtend(jsonCopy(defaultConfig), targetConfig)

  return targetConfig
}

export {
  jsonCopy,
  isEmpty,
  prepareConfig,
}
