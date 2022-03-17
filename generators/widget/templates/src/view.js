import React from 'react'
import { render } from 'react-dom'
import { initializeWidget } from '../shared/utils/verintEnv'
import { ConfigContext, DEFAULT_CONFIG } from './constants/ConfigContext'
import WidgetView from './components-view/WidgetView'
import { prepareConfig } from '../shared/utils/converter'
import { CONVERTERS } from './constants/converters'

initializeWidget(WIDGET_SAFE_NAME, 'view', async params => {
  try {
    // eslint-disable-next-line no-undef
    console.info(`Widget name: "${WIDGET_NAME}". Package version: "${PACKAGE_VERSION}", params:`, params)

    // params are passed into widget JS on start, function defined in statics/main/contentScript.vm.ejs
    const { widgetId, attachmentsRootUrl, configJSONText } = params
    const rootURL = new URL(attachmentsRootUrl)

    const root = document.querySelector(`#${widgetId}`)

    const loadedConfig = configJSONText ? JSON.parse(configJSONText) : {}
    const finalConfig = await prepareConfig(loadedConfig, DEFAULT_CONFIG.config, CONVERTERS)

    const app = (
      <ConfigContext.Provider
        value={{
          ...params,
          config: finalConfig,
          originUrl: rootURL.origin
        }}
      >
        <WidgetView />
      </ConfigContext.Provider>
    )

    render(app, root)
  } catch (err) {
    console.error(err)
  }
})
