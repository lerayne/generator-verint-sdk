import React, { useContext } from 'react'
import css from './WidgetView.scss'
import { ConfigContext } from '../../constants/ConfigContext'

export default function WidgetView () {
  const { originUrl, config, lang } = useContext(ConfigContext)

  return (
    <div className={css.main}>
      text value: {config.testTextField}
    </div>
  )
}
