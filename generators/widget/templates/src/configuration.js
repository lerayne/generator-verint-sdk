import React from 'react'
import { render } from 'react-dom'
import { initializeWidget } from '../../src/shared/utils/verintEnv'
import { ConfigContext } from './constants/ConfigContext'
import WidgetConfigPanel from './components-configuration/WidgetConfigPanel'

console.log('configuration')

initializeWidget(WIDGET_SAFE_NAME, 'configuration', async params => {
  try {
    // eslint-disable-next-line no-undef
    console.info(`Widget name: "${WIDGET_NAME}". Package version: "${PACKAGE_VERSION}", params: `, params)

    // params are passed into widget JS on start, function defined in statics/main/configuration.vm.ejs
    const { widgetId, attachmentsRootUrl, onSaveJSONText, configJSONText } = params
    const rootURL = new URL(attachmentsRootUrl)

    const root = document.querySelector(`#${widgetId}`)

    const app = (
      <ConfigContext.Provider
        value={{
          ...params,
          config: configJSONText ? JSON.parse(configJSONText) : {},
          originUrl: rootURL.origin
        }}
      >
        <WidgetConfigPanel onSave={newConfig => onSaveJSONText(JSON.stringify(newConfig))} />
      </ConfigContext.Provider>
    )

    render(app, root)
  } catch (err) {
    console.error(err)
  }
})
