import { loadState, saveState } from './storage'

function uid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

function normalizeName(name) {
  return String(name ?? '').trim()
}

export function extractMentionedNames(text) {
  // Mentions are tokens like @Name or @name_123.
  // Keeping it token-based avoids accidentally capturing connecting words like "and".
  const t = String(text ?? '')
  const matches = t.match(/@([\p{L}\p{N}_]{2,})/gu) ?? []
  return [...new Set(matches.map((m) => m.slice(1).trim()).filter(Boolean))]
}

export function createInitialState() {
  const now = Date.now()
  return {
    version: 1,
    createdAt: now,
    posts: [],
  }
}

export function loadOrCreateState() {
  return loadState() ?? createInitialState()
}

export function persistState(state) {
  saveState(state)
}

export function addPost(state, { author, text }) {
  const next = structuredClone(state)
  const a = normalizeName(author)
  const t = String(text ?? '').trim()
  // Backward compatible: allow either (author) or (authorId + authorName)
  const authorId = String(arguments[1]?.authorId ?? '').trim()
  const authorName = normalizeName(arguments[1]?.authorName ?? a)
  if (!authorName) throw new Error('Author is required')
  if (!t) throw new Error('Post text is required')

  const post = {
    id: uid(),
    author: authorName,
    authorId: authorId || undefined,
    text: t,
    mentionedNames: extractMentionedNames(t),
    createdAt: Date.now(),
    comments: [],
  }

  next.posts.unshift(post)
  return next
}

export function addComment(state, { postId, author, text }) {
  const next = structuredClone(state)
  const a = normalizeName(author)
  const t = String(text ?? '').trim()
  const authorId = String(arguments[1]?.authorId ?? '').trim()
  const authorName = normalizeName(arguments[1]?.authorName ?? a)
  if (!authorName) throw new Error('Comment author is required')
  if (!t) throw new Error('Comment text is required')

  const post = next.posts.find((p) => p.id === postId)
  if (!post) throw new Error('Post not found')

  post.comments.push({
    id: uid(),
    author: authorName,
    authorId: authorId || undefined,
    text: t,
    createdAt: Date.now(),
  })

  return next
}

export function deletePost(state, { postId }) {
  const next = structuredClone(state)
  next.posts = next.posts.filter((p) => p.id !== postId)
  return next
}

export function deleteComment(state, { postId, commentId }) {
  const next = structuredClone(state)
  const post = next.posts.find((p) => p.id === postId)
  if (!post) throw new Error('Post not found')

  post.comments = post.comments.filter((c) => c.id !== commentId)
  return next
}

export function ratePost(state, { postId, rater, rating }) {
  const next = structuredClone(state)
  const rr = normalizeName(rater)
  const value = Number(rating)
  const raterId = String(arguments[1]?.raterId ?? '').trim()
  const raterName = normalizeName(arguments[1]?.raterName ?? rr)
  const keyId = raterId || raterName.toLowerCase()
  if (!keyId) throw new Error('Rater is required')
  // Allow 0 to remove a rating.
  if (!Number.isFinite(value) || value < 0 || value > 5) throw new Error('Rating must be 0-5')

  const post = next.posts.find((p) => p.id === postId)
  if (!post) throw new Error('Post not found')

  post.ratings = post.ratings ?? []
  const existing = post.ratings.find((r) => (r.raterId || r.rater?.toLowerCase()) === keyId)
  if (value === 0) {
    post.ratings = post.ratings.filter((r) => (r.raterId || r.rater?.toLowerCase()) !== keyId)
    return next
  }

  if (existing) {
    existing.value = value
    existing.updatedAt = Date.now()
  } else {
    post.ratings.push({
      id: uid(),
      rater: raterName,
      raterId: raterId || undefined,
      value,
      createdAt: Date.now(),
    })
  }

  return next
}

export function getPostAverageRating(post) {
  const ratings = post.ratings ?? []
  if (!ratings.length) return 0
  const sum = ratings.reduce((acc, r) => acc + Number(r.value || 0), 0)
  return sum / ratings.length
}

export function buildLeaderboard(state) {
  // Scoring rule (as requested):
  // For each post, compute average rating for that post.
  // Every mentioned name in that post receives that average added to their total.
  const map = new Map()

  for (const post of state.posts) {
    const avg = getPostAverageRating(post)
    if (!avg) continue
    const names = post.mentionedNames ?? extractMentionedNames(post.text)
    for (const name of names) {
      const key = name.toLowerCase()
      const existing = map.get(key) ?? { name, score: 0, postsMentionedIn: 0 }
      existing.score += avg
      existing.postsMentionedIn += 1
      existing.name = existing.name || name
      map.set(key, existing)
    }
  }

  return [...map.values()].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
}
