import { registerSW } from 'virtual:pwa-register'

let registrationPromise

export function ensureServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return Promise.resolve(null)
  }

  if (!registrationPromise) {
    registrationPromise = new Promise((resolve) => {
      const updateSW = registerSW({
        immediate: true,
        onRegisteredSW(_swUrl, registration) {
          resolve(registration || null)
        },
        onRegisterError(error) {
          console.error('Service worker registration failed', error)
          resolve(null)
        },
      })

      // Some versions return a function to trigger registration
      if (typeof updateSW === 'function') {
        updateSW()
      }
    })
  }

  return registrationPromise
}

export function getNotificationPermission() {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') return 'unsupported'
  return Notification.permission
}

export async function requestNotificationPermission() {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') return 'unsupported'
  const existing = Notification.permission
  if (existing === 'granted' || existing === 'denied') return existing
  return Notification.requestPermission()
}

export async function showLocalNotification(title, options) {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') return false
  if (Notification.permission !== 'granted') return false

  const registration = await ensureServiceWorker()
  if (!registration?.showNotification) return false

  await registration.showNotification(title, {
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: options?.tag || 'kpl-local',
    ...options,
  })
  return true
}

export function subscribePermissionListener(setter) {
  if (!('permissions' in navigator) || typeof Notification === 'undefined') return () => {}
  let handle
  navigator.permissions.query({ name: 'notifications' }).then((status) => {
    const toPermission = (state) => (state === 'prompt' ? 'default' : state)
    setter(toPermission(status.state))
    handle = () => setter(toPermission(status.state))
    status.onchange = handle
  })

  return () => {
    if (handle && 'permissions' in navigator) {
      navigator.permissions.query({ name: 'notifications' }).then((status) => {
        if (status.onchange === handle) status.onchange = null
      })
    }
  }
}
