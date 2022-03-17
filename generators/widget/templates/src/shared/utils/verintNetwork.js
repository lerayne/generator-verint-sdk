import jQuery from 'verint/jquery'

class AbortError extends Error {
  constructor (message) {
    super(message)
    this.name = 'AbortError'
  }
}

export class NetworkError extends Error {
  constructor (message) {
    super(message)
    this.name = 'NetworkError'
  }
}

export function verintRestRequest (method, url, data, signal) {
  return new Promise((resolve, reject) => {
    const xhr = jQuery.telligent.evolution[method]({
      url,
      data,
      success: result => {
        signal?.removeEventListener('abort', onAbort)
        resolve(result)
      },
      error: xhr => {
        signal?.removeEventListener('abort', onAbort)
        reject(new NetworkError(xhr.status))
      }
    })

    function onAbort () {
      xhr.abort()
      reject(new AbortError('verintRestGet aborted'))
    }

    signal?.addEventListener('abort', onAbort)
  })
}
