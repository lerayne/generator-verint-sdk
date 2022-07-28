import React, { useContext } from 'react'

import { ConfigContext } from '../../constants/ConfigContext'

import css from './WidgetView.scss'

export default function WidgetView () {
  const { originUrl, config, lang } = useContext(ConfigContext)

  return (
    <div className={css.main}>
      text value: {config.testTextField}
    </div>
  ) 
}
