/* eslint-disable no-param-reassign,import/no-unresolved,import/prefer-default-export */
import jQuery from 'verint/jquery'

export function initializeWidget (widgetName, widgetPart, registerCallback) {
  // eslint-disable-next-line id-match
  (function extendJQuery ($) {
    // ensure widget availability in the global scope:
    if (typeof $.telligent === 'undefined') $.telligent = {}
    // todo: what is evolution part? is it necessary?
    if (typeof $.telligent.evolution === 'undefined') $.telligent.evolution = {}
    if (typeof $.telligent.evolution.widgets === 'undefined') $.telligent.evolution.widgets = {}
    if (typeof $.telligent.evolution.widgets[widgetName] === 'undefined') {
      $.telligent.evolution.widgets[widgetName] = {}
    }
    $.telligent.evolution.widgets[widgetName][widgetPart] = {
      register: registerCallback,
    }
  })(jQuery)
}
