import { Router } from 'express'
import User from '../models/User.js'
import Post from '../models/Post.js'

const router = Router()

// GET /api/profile/:name — public profile for a display name
router.get('/:name', async (req, res) => {
  try {
    const name = decodeURIComponent(req.params.name)
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

    // Try exact displayName or nickname match first (case-insensitive)
    let user = await User.findOne({
      $or: [
        { displayName: { $regex: new RegExp(`^${escaped}$`, 'i') } },
        { nickname: { $regex: new RegExp(`^${escaped}$`, 'i') } },
      ],
    }).lean()

    // If not found, try matching as a first name (e.g. @Asha → "Asha Sharma")
    if (!user) {
      user = await User.findOne({
        $or: [
          { displayName: { $regex: new RegExp(`^${escaped}\\b`, 'i') } },
          { nickname: { $regex: new RegExp(`^${escaped}\\b`, 'i') } },
        ],
      }).lean()
    }

    if (!user) return res.status(404).json({ error: 'User not found' })

    // All posts
    const allPosts = await Post.find().lean({ virtuals: true })

    // Build a uid→nickname and name→nickname lookup
    const allUsers = await User.find({}, 'firebaseUid displayName nickname').lean()
    const uidToNick = new Map()
    const nameToNick = new Map()
    for (const u of allUsers) {
      const resolved = u.nickname || u.displayName || ''
      if (u.firebaseUid) uidToNick.set(u.firebaseUid, resolved)
      if (u.displayName) {
        nameToNick.set(u.displayName.toLowerCase(), resolved)
        const first = u.displayName.split(/\s+/)[0].toLowerCase()
        if (first) nameToNick.set(first, resolved)
      }
      if (u.nickname) nameToNick.set(u.nickname.toLowerCase(), u.nickname)
    }

    // Patch post fields to use nicknames
    function patchPost(p) {
      if (p.authorId && uidToNick.has(p.authorId)) p.author = uidToNick.get(p.authorId)
      if (p.mentionedNames?.length) {
        p.mentionedNames = p.mentionedNames.map((n) => nameToNick.get(n.toLowerCase()) || n)
      }
      return p
    }

    // Posts authored by this user
    const authoredPosts = allPosts
      .filter((p) => p.authorId === user.firebaseUid)
      .map(patchPost)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

    // Posts where this user is mentioned (match by displayName, nickname, or first name)
    const nameLower = user.displayName.toLowerCase()
    const firstName = nameLower.split(/\s+/)[0]
    const nickLower = (user.nickname || '').toLowerCase()
    const mentionedPosts = allPosts
      .filter((p) =>
        (p.mentionedNames ?? []).some((m) => {
          const ml = m.toLowerCase()
          return ml === firstName || ml === nameLower || (nickLower && ml === nickLower)
        }),
      )
      .map(patchPost)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

    // Comments by this user (across all posts)
    const userComments = []
    for (const p of allPosts) {
      const postAuthorNick = (p.authorId && uidToNick.get(p.authorId)) || p.author
      for (const c of p.comments ?? []) {
        if (c.authorId === user.firebaseUid) {
          userComments.push({
            ...c,
            postId: p._id,
            postAuthor: postAuthorNick,
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
        const resolvedName = nameToNick.get(key) || mn
        const existing = leaderboardMap.get(key) ?? { name: resolvedName, score: 0, postsMentionedIn: 0 }
        existing.score += avg
        existing.postsMentionedIn += 1
        existing.name = resolvedName
        leaderboardMap.set(key, existing)
      }
    }
    const leaderboard = [...leaderboardMap.values()].sort(
      (a, b) => b.score - a.score || a.name.localeCompare(b.name),
    )

    const overallEntry = leaderboard.find(
      (r) => {
        const rl = r.name.toLowerCase()
        return rl === firstName || rl === nameLower || (nickLower && rl === nickLower)
      },
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
        return ml === firstName || ml === nameLower || (nickLower && ml === nickLower)
      })
      if (mentioned) monthlyScore += avg
    }
    monthlyScore = Math.round(monthlyScore * 100) / 100

    res.json({
      user: {
        _id: user._id,
        firebaseUid: user.firebaseUid,
        displayName: user.displayName,
        nickname: user.nickname || '',
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
    const { bio, birthday, nickname } = req.body
    const update = {}
    if (bio !== undefined) update.bio = bio
    if (birthday !== undefined) update.birthday = birthday
    if (nickname !== undefined) update.nickname = nickname

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
