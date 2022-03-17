import jQuery from 'verint/jquery'

export function initializeWidget (widgetName, widgetPart, registerCallback) {
  (function ($) {
    // ensure widget availability in the global scope:
    if (typeof $.telligent === 'undefined') $.telligent = {}
    //todo: what is evolution part? is it necessary?
    if (typeof $.telligent.evolution === 'undefined') $.telligent.evolution = {}
    if (typeof $.telligent.evolution.widgets === 'undefined') $.telligent.evolution.widgets = {}
    if (typeof $.telligent.evolution.widgets[widgetName] === 'undefined') $.telligent.evolution.widgets[widgetName] = {}
    $.telligent.evolution.widgets[widgetName][widgetPart] = {
      register: registerCallback
    }
  })(jQuery)
}
