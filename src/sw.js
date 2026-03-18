/* eslint-disable no-undef */
/* eslint-disable no-restricted-globals */
import { clientsClaim } from 'workbox-core'
import { precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies'

self.skipWaiting()
clientsClaim()

precacheAndRoute(self.__WB_MANIFEST)

registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({ cacheName: 'kpl-pages', networkTimeoutSeconds: 5 }),
)

registerRoute(
  ({ request }) => request.destination === 'script' || request.destination === 'style' || request.destination === 'worker',
  new StaleWhileRevalidate({ cacheName: 'kpl-assets' }),
)

registerRoute(
  ({ request }) => request.destination === 'image' || request.destination === 'font',
  new CacheFirst({ cacheName: 'kpl-media' }),
)

registerRoute(
  ({ url, request }) => request.method === 'GET' && url.pathname.startsWith('/api/'),
  new NetworkFirst({ cacheName: 'kpl-api', networkTimeoutSeconds: 5 }),
)

self.addEventListener('push', (event) => {
  const data = (() => {
    try {
      return event.data?.json() ?? {}
    } catch (err) {
      return { body: event.data?.text() }
    }
  })()

  const title = data.title || 'KPL update'
  const body = data.body || 'You have a new notification.'
  const options = {
    body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: data.url ? { url: data.url } : {},
    tag: data.tag || 'kpl-push',
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = event.notification.data?.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus()
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl)
      }
      return undefined
    }),
  )
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'LOCAL_NOTIFICATION') {
    const { title, options } = event.data.payload || {}
    self.registration.showNotification(title || 'KPL notification', {
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: 'kpl-local',
      ...options,
    })
  }
})
