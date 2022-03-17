import { createContext } from 'react'

export const DEFAULT_CONFIG = {
  widgetId: '',
  wrapperElementId: '',
  attachmentsRootUrl: '',
  originUrl: '',
  config: {
    testTextField: 'Test Value'
  }
}

export const ConfigContext = createContext(DEFAULT_CONFIG)
