import { Router } from 'express'
import Post from '../models/Post.js'
import User from '../models/User.js'

const router = Router()

// GET /api/leaderboard
router.get('/', async (_req, res) => {
  try {
    const posts = await Post.find().lean({ virtuals: true })

    // Build a name→nickname lookup from all users
    const allUsers = await User.find({}, 'displayName nickname').lean()
    const nickLookup = new Map()
    for (const u of allUsers) {
      if (u.displayName) {
        const full = u.displayName.toLowerCase()
        const first = full.split(/\s+/)[0]
        const resolved = u.nickname || u.displayName
        nickLookup.set(full, resolved)
        if (first) nickLookup.set(first, resolved)
      }
      if (u.nickname) {
        nickLookup.set(u.nickname.toLowerCase(), u.nickname)
      }
    }

    const map = new Map()

    for (const post of posts) {
      const ratings = post.ratings ?? []
      if (!ratings.length) continue
      const avg = ratings.reduce((s, r) => s + r.value, 0) / ratings.length

      for (const name of post.mentionedNames ?? []) {
        const key = name.toLowerCase()
        const displayAs = nickLookup.get(key) || name
        const existing = map.get(key) ?? { name: displayAs, score: 0, postsMentionedIn: 0 }
        existing.score += avg
        existing.postsMentionedIn += 1
        existing.name = displayAs
        map.set(key, existing)
      }
    }

    const rows = [...map.values()].sort(
      (a, b) => b.score - a.score || a.name.localeCompare(b.name),
    )

    res.json(rows)
  } catch (err) {
    console.error('GET /leaderboard error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
