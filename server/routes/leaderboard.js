import { Router } from 'express'
import Post from '../models/Post.js'

const router = Router()

// GET /api/leaderboard
router.get('/', async (_req, res) => {
  try {
    const posts = await Post.find().lean({ virtuals: true })

    const map = new Map()

    for (const post of posts) {
      const ratings = post.ratings ?? []
      if (!ratings.length) continue
      const avg = ratings.reduce((s, r) => s + r.value, 0) / ratings.length

      for (const name of post.mentionedNames ?? []) {
        const key = name.toLowerCase()
        const existing = map.get(key) ?? { name, score: 0, postsMentionedIn: 0 }
        existing.score += avg
        existing.postsMentionedIn += 1
        existing.name = existing.name || name
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
