// API client — talks to the Express backend

const BASE = import.meta.env.VITE_API_URL || ''

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `API error ${res.status}`)
  }
  return res.json()
}

// Auth
export function syncUser({ firebaseUid, displayName, email, photoURL }) {
  return request('/api/auth/sync', {
    method: 'POST',
    body: JSON.stringify({ firebaseUid, displayName, email, photoURL }),
  })
}

// Posts
export function fetchPosts() {
  return request('/api/posts')
}

export function createPost({ authorId, authorName, authorPhotoURL, text }) {
  return request('/api/posts', {
    method: 'POST',
    body: JSON.stringify({ authorId, authorName, authorPhotoURL, text }),
  })
}

export function removePost(postId, userId) {
  return request(`/api/posts/${postId}?userId=${encodeURIComponent(userId)}`, { method: 'DELETE' })
}

// Comments
export function createComment(postId, { authorId, authorName, authorPhotoURL, text }) {
  return request(`/api/posts/${postId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ authorId, authorName, authorPhotoURL, text }),
  })
}

export function removeComment(postId, commentId, userId) {
  return request(`/api/posts/${postId}/comments/${commentId}?userId=${encodeURIComponent(userId)}`, { method: 'DELETE' })
}

export function createReply(postId, commentId, { authorId, authorName, authorPhotoURL, text }) {
  return request(`/api/posts/${postId}/comments/${commentId}/replies`, {
    method: 'POST',
    body: JSON.stringify({ authorId, authorName, authorPhotoURL, text }),
  })
}

// Ratings
export function ratePost(postId, { raterId, raterName, rating }) {
  return request(`/api/posts/${postId}/rate`, {
    method: 'POST',
    body: JSON.stringify({ raterId, raterName, rating }),
  })
}

// Leaderboard
export function fetchLeaderboard() {
  return request('/api/leaderboard')
}

// Users (for @mention autocomplete)
export function fetchUsers() {
  return request('/api/auth/users')
}

// Profile
export function fetchProfile(name) {
  return request(`/api/profile/${encodeURIComponent(name)}`)
}

export function updateProfile(uid, { bio, birthday }) {
  return request(`/api/profile/${uid}`, {
    method: 'PATCH',
    body: JSON.stringify({ bio, birthday }),
  })
}

// Notifications
export function fetchNotifications(uid) {
  return request(`/api/notifications?uid=${encodeURIComponent(uid)}`)
}

export function fetchUnreadCount(uid) {
  return request(`/api/notifications/unread-count?uid=${encodeURIComponent(uid)}`)
}

export function markNotificationsRead(uid) {
  return request('/api/notifications/read', {
    method: 'PATCH',
    body: JSON.stringify({ uid }),
  })
}

export function deleteNotification(id) {
  return request(`/api/notifications/${id}`, { method: 'DELETE' })
}

export function deleteAllNotifications(uid) {
  return request(`/api/notifications?uid=${encodeURIComponent(uid)}`, { method: 'DELETE' })
}
