/* global EMBED_SAFE_NAME EMBED_NAME PACKAGE_VERSION URL */
// eslint-disable-next-line import/no-unused-modules
import React          from 'react'
import { createRoot } from 'react-dom/client'

import { initializeWidget }              from './shared/utils/verintEnv'
import { ConfigContext, DEFAULT_CONFIG } from './constants/ConfigContext'
import WidgetView                        from './components-view/WidgetView'
import { prepareConfig }                 from './shared/utils/converter'
import { CONVERTERS }                    from './constants/converters'

initializeWidget(EMBED_SAFE_NAME, 'view', async params => {
  try {
    console.info(`Embeddable name: "${EMBED_NAME}". Package version: "${PACKAGE_VERSION}", params:`, params)

    // params are passed into widget JS on start, function defined in
    // statics/main/contentScript.vm.ejs
    const { embedId, attachmentsRootUrl, configJSONText } = params
    const rootURL = new URL(attachmentsRootUrl)

    const loadedConfig = configJSONText ? JSON.parse(configJSONText) : {}
    const finalConfig = await prepareConfig(loadedConfig, DEFAULT_CONFIG.config, CONVERTERS)

    // suppressed, because this is an initial render, it won't ever be re-rendered
    // eslint-disable-next-line react/jsx-no-constructed-context-values
    const contextValue = {
      ...params,
      config:    finalConfig,
      originUrl: rootURL.origin,
    }

    const root = createRoot(window.document.querySelector(`#${embedId}`))

    root.render(
      <ConfigContext.Provider value={contextValue}>
        <WidgetView />
      </ConfigContext.Provider>
    )
  } catch (err) {
    console.error(err)
  }
})
