/* globals EMBED_SAFE_NAME EMBED_NAME PACKAGE_VERSION URL */
// eslint-disable-next-line import/no-unused-modules
import React          from 'react'
import { createRoot } from 'react-dom/client'

import { initializeWidget } from './shared/utils/verintEnv'
import { ConfigContext }    from './constants/ConfigContext'
import WidgetConfigPanel    from './components-configuration/WidgetConfigPanel'

console.log('configuration')

initializeWidget(EMBED_SAFE_NAME, 'configuration', params => {
  try {
    console.info(`Embeddable name: "${EMBED_NAME}". Package version: "${PACKAGE_VERSION}", params: `, params)

    // params are passed into widget JS on start, function defined in
    // statics/main/configuration.vm.ejs
    const { embedConfigId, attachmentsRootUrl, onSaveJSONText, configJSONText } = params
    const rootURL = new URL(attachmentsRootUrl)

    // suppressed, because this is an initial render, it won't ever be re-rendered
    // eslint-disable-next-line react/jsx-no-constructed-context-values
    const contextValue = {
      ...params,
      config:    configJSONText ? JSON.parse(configJSONText) : {},
      originUrl: rootURL.origin,
    }

    const root = createRoot(window.document.querySelector(`#${embedConfigId}`))

    root.render(
      <ConfigContext.Provider value={contextValue}>
        <WidgetConfigPanel onSave={newConfig => onSaveJSONText(JSON.stringify(newConfig))} />
      </ConfigContext.Provider>
    )
  } catch (err) {
    console.error(err)
  }
})
