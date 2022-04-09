/* globals WIDGET_SAFE_NAME WIDGET_NAME PACKAGE_VERSION URL */
// eslint-disable-next-line import/no-unused-modules
import React      from 'react'
import { render } from 'react-dom'

import { initializeWidget } from '../../src/shared/utils/verintEnv'
import { ConfigContext }    from './constants/ConfigContext'
import WidgetConfigPanel    from './components-configuration/WidgetConfigPanel' 

console.log('configuration')

initializeWidget(WIDGET_SAFE_NAME, 'configuration', params => {
  try {
    console.info(`Widget name: "${WIDGET_NAME}". Package version: "${PACKAGE_VERSION}", params: `, params)

    // params are passed into widget JS on start, function defined in
    // statics/main/configuration.vm.ejs
    const { widgetId, attachmentsRootUrl, onSaveJSONText, configJSONText } = params
    const rootURL = new URL(attachmentsRootUrl)

    const root = window.document.querySelector(`#${widgetId}`)

    // suppressed, because this is an initial render, it won't ever be re-rendered
    // eslint-disable-next-line react/jsx-no-constructed-context-values
    const contextValue = {
      ...params,
      config:    configJSONText ? JSON.parse(configJSONText) : {},
      originUrl: rootURL.origin,
    }

    const app = (
      <ConfigContext.Provider value={contextValue}>
        <WidgetConfigPanel onSave={newConfig => onSaveJSONText(JSON.stringify(newConfig))} />
      </ConfigContext.Provider>
    )

    render(app, root)
  } catch (err) {
    console.error(err)
  }
})
