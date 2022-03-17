import React, { useContext, useState } from 'react'
import { useSetState } from 'react-use'
import css from './WidgetConfigPanel.scss'

import { ConfigContext } from '../../constants/ConfigContext'

export default function WidgetConfigPanel ({ onSave }) {
  const { config: initialConfig, originUrl, lang } = useContext(ConfigContext)
  const [configState, setConfigState] = useSetState(initialConfig)
  const [validationError, setValidationError] = useState('')

  function validateAll (state = configState) {
    //validate channelId
    if (!state.testTextField) {
      setValidationError('Text is required')
      return false
    }

    setValidationError('')
    return true
  }

  return (
    <div className={css.main}>
      <input
        type='text'
        value={configState.testTextField}
        onChange={e => setConfigState({ testTextField: e.target.value })}
      />

      <div className='footer'>
        <button
          className='save-button'
          disabled={validationError}
          onClick={() => {
            console.log('onClick', configState)
            if (validateAll()) {
              onSave(configState)
            }
          }}
        >save
        </button>
      </div>
    </div>
  )
}
