import { Router } from 'express'
import User from '../models/User.js'
import Post from '../models/Post.js'

const router = Router()

// GET /api/profile/:name — public profile for a display name
router.get('/:name', async (req, res) => {
  try {
    const name = decodeURIComponent(req.params.name)
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

    // Try exact displayName match first (case-insensitive)
    let user = await User.findOne({
      displayName: { $regex: new RegExp(`^${escaped}$`, 'i') },
    }).lean()

    // If not found, try matching as a first name (e.g. @Asha → "Asha Sharma")
    if (!user) {
      user = await User.findOne({
        displayName: { $regex: new RegExp(`^${escaped}\\b`, 'i') },
      }).lean()
    }

    if (!user) return res.status(404).json({ error: 'User not found' })

    // All posts
    const allPosts = await Post.find().lean({ virtuals: true })

    // Posts authored by this user
    const authoredPosts = allPosts
      .filter((p) => p.authorId === user.firebaseUid)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

    // Posts where this user is mentioned
    const nameLower = user.displayName.toLowerCase()
    const firstName = nameLower.split(/\s+/)[0]
    const mentionedPosts = allPosts
      .filter((p) =>
        (p.mentionedNames ?? []).some((m) => {
          const ml = m.toLowerCase()
          return ml === firstName || ml === nameLower
        }),
      )
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

    // Comments by this user (across all posts)
    const userComments = []
    for (const p of allPosts) {
      for (const c of p.comments ?? []) {
        if (c.authorId === user.firebaseUid) {
          userComments.push({
            ...c,
            postId: p._id,
            postAuthor: p.author,
            postText: p.text.slice(0, 80),
          })
        }
      }
    }
    userComments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

    // Overall score & rank
    const leaderboardMap = new Map()
    for (const post of allPosts) {
      const ratings = post.ratings ?? []
      if (!ratings.length) continue
      const avg = ratings.reduce((s, r) => s + r.value, 0) / ratings.length
      for (const mn of post.mentionedNames ?? []) {
        const key = mn.toLowerCase()
        const existing = leaderboardMap.get(key) ?? { name: mn, score: 0, postsMentionedIn: 0 }
        existing.score += avg
        existing.postsMentionedIn += 1
        leaderboardMap.set(key, existing)
      }
    }
    const leaderboard = [...leaderboardMap.values()].sort(
      (a, b) => b.score - a.score || a.name.localeCompare(b.name),
    )

    const overallEntry = leaderboard.find(
      (r) => r.name.toLowerCase() === firstName || r.name.toLowerCase() === nameLower,
    )
    const overallScore = overallEntry ? Math.round(overallEntry.score * 100) / 100 : 0
    const overallRank = overallEntry ? leaderboard.indexOf(overallEntry) + 1 : null
    const totalMentions = overallEntry ? overallEntry.postsMentionedIn : 0

    // Monthly score (current month)
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    let monthlyScore = 0
    for (const post of allPosts) {
      if (new Date(post.createdAt) < monthStart) continue
      const ratings = post.ratings ?? []
      if (!ratings.length) continue
      const avg = ratings.reduce((s, r) => s + r.value, 0) / ratings.length
      const mentioned = (post.mentionedNames ?? []).some((m) => {
        const ml = m.toLowerCase()
        return ml === firstName || ml === nameLower
      })
      if (mentioned) monthlyScore += avg
    }
    monthlyScore = Math.round(monthlyScore * 100) / 100

    res.json({
      user: {
        _id: user._id,
        firebaseUid: user.firebaseUid,
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        bio: user.bio || '',
        birthday: user.birthday || '',
        createdAt: user.createdAt,
      },
      stats: {
        overallScore,
        monthlyScore,
        overallRank,
        totalMentions,
        totalPosts: authoredPosts.length,
        totalComments: userComments.length,
      },
      authoredPosts,
      mentionedPosts,
      userComments,
    })
  } catch (err) {
    console.error('GET /profile error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// PATCH /api/profile/:uid — update own profile (bio, birthday)
router.patch('/:uid', async (req, res) => {
  try {
    const { bio, birthday } = req.body
    const update = {}
    if (bio !== undefined) update.bio = bio
    if (birthday !== undefined) update.birthday = birthday

    const user = await User.findOneAndUpdate(
      { firebaseUid: req.params.uid },
      update,
      { new: true },
    ).lean()

    if (!user) return res.status(404).json({ error: 'User not found' })
    res.json(user)
  } catch (err) {
    console.error('PATCH /profile error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
