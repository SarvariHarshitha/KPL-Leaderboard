import { Router } from 'express'
import mongoose from 'mongoose'
import Post from '../models/Post.js'
import User from '../models/User.js'
import { notifyMentioned, notifyComment, notifyRating } from '../lib/notify.js'

const router = Router()

// Helper: extract @mentions from text
function extractMentionedNames(text) {
  const t = String(text ?? '')
  const matches = t.match(/@([\p{L}\p{N}_]{2,})/gu) ?? []
  return [...new Set(matches.map((m) => m.slice(1).trim()).filter(Boolean))]
}

// Build a uid→nickname map from the User collection
async function buildNicknameMap() {
  const users = await User.find({}, 'firebaseUid displayName nickname').lean()
  const map = new Map()
  for (const u of users) {
    if (u.firebaseUid) {
      map.set(u.firebaseUid, u.nickname || u.displayName || '')
    }
    // Also map by displayName (lowercased) for mention lookups
    if (u.displayName) {
      map.set(`name:${u.displayName.toLowerCase()}`, u.nickname || u.displayName)
      const first = u.displayName.split(/\s+/)[0].toLowerCase()
      if (first) map.set(`name:${first}`, u.nickname || u.displayName)
    }
    if (u.nickname) {
      map.set(`name:${u.nickname.toLowerCase()}`, u.nickname)
    }
  }
  return map
}

// Apply nickname to a post (author, comments, ratings, mentionedNames)
function applyNicknames(post, nickMap) {
  // Post author
  if (post.authorId && nickMap.has(post.authorId)) {
    post.author = nickMap.get(post.authorId)
  }
  // Mentioned names — resolve to nickname
  if (post.mentionedNames?.length) {
    post.mentionedNames = post.mentionedNames.map((n) => {
      const resolved = nickMap.get(`name:${n.toLowerCase()}`)
      return resolved || n
    })
  }
  // Comments (recursive)
  function patchComments(list) {
    for (const c of list) {
      if (c.authorId && nickMap.has(c.authorId)) {
        c.author = nickMap.get(c.authorId)
      }
      if (c.replies?.length) patchComments(c.replies)
    }
  }
  if (post.comments?.length) patchComments(post.comments)
  // Ratings
  if (post.ratings?.length) {
    for (const r of post.ratings) {
      if (r.raterId && nickMap.has(r.raterId)) {
        r.raterName = nickMap.get(r.raterId)
      }
    }
  }
  return post
}

// GET /api/posts — list all posts (newest first)
router.get('/', async (_req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 }).lean({ virtuals: true })
    const nickMap = await buildNicknameMap()
    const patched = posts.map((p) => applyNicknames(p, nickMap))
    res.json(patched)
  } catch (err) {
    console.error('GET /posts error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/posts — create post
router.post('/', async (req, res) => {
  try {
    const { authorId, authorName, authorPhotoURL, text, type } = req.body
    if (!authorId || !authorName) return res.status(400).json({ error: 'Author info required' })
    if (!text?.trim()) return res.status(400).json({ error: 'Post text is required' })
    if (type && !['rating', 'social'].includes(type)) {
      return res.status(400).json({ error: 'Invalid post type' })
    }

    const post = await Post.create({
      authorId,
      author: authorName,
      authorPhotoURL: authorPhotoURL || '',
      text: text.trim(),
      type: type || 'rating',
      mentionedNames: extractMentionedNames(text),
      likes: [],
    })

    // Notify mentioned users
    notifyMentioned({
      mentionedNames: post.mentionedNames,
      authorUid: authorId,
      authorName,
      authorPhotoURL,
      postId: post._id,
    })

    res.status(201).json(post.toJSON())
  } catch (err) {
    console.error('POST /posts error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// DELETE /api/posts/:id
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.query.userId
    if (!userId) return res.status(400).json({ error: 'userId is required' })

    const post = await Post.findById(req.params.id)
    if (!post) return res.status(404).json({ error: 'Post not found' })

    // Check if user is admin or the post author
    const reqUser = await User.findOne({ firebaseUid: userId }).lean()
    const isAdmin = reqUser?.role === 'admin'
    const isAuthor = post.authorId === userId

    if (!isAdmin && !isAuthor) {
      return res.status(403).json({ error: 'Only the author or an admin can delete this post' })
    }

    await Post.findByIdAndDelete(req.params.id)
    res.json({ ok: true })
  } catch (err) {
    console.error('DELETE /posts error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/posts/:id/comments — add comment
router.post('/:id/comments', async (req, res) => {
  try {
    const { authorId, authorName, authorPhotoURL, text } = req.body
    if (!authorId || !authorName) return res.status(400).json({ error: 'Author info required' })
    if (!text?.trim()) return res.status(400).json({ error: 'Comment text is required' })

    const post = await Post.findById(req.params.id)
    if (!post) return res.status(404).json({ error: 'Post not found' })

    post.comments.push({ authorId, author: authorName, authorPhotoURL: authorPhotoURL || '', text: text.trim() })
    await post.save()

    // Notify post author about the comment
    notifyComment({ post, commenterUid: authorId, commenterName: authorName, commenterPhotoURL: authorPhotoURL })

    res.status(201).json(post.toJSON())
  } catch (err) {
    console.error('POST /comments error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// DELETE /api/posts/:postId/comments/:commentId
router.delete('/:postId/comments/:commentId', async (req, res) => {
  try {
    const userId = req.query.userId
    if (!userId) return res.status(400).json({ error: 'userId is required' })

    const post = await Post.findById(req.params.postId)
    if (!post) return res.status(404).json({ error: 'Post not found' })

    // Check if user is admin or the comment author
    const reqUser = await User.findOne({ firebaseUid: userId }).lean()
    const isAdmin = reqUser?.role === 'admin'

    // Recursively find and remove a comment by id
    function removeFromList(list, id) {
      for (let i = 0; i < list.length; i++) {
        if (list[i]._id.toString() === id) {
          if (!isAdmin && list[i].authorId !== userId) return false
          list.splice(i, 1)
          return true
        }
        if (list[i].replies?.length && removeFromList(list[i].replies, id)) return true
      }
      return false
    }

    if (!removeFromList(post.comments, req.params.commentId)) {
      return res.status(404).json({ error: 'Comment not found or not authorized' })
    }

    post.markModified('comments')
    await post.save()

    res.json(post.toJSON())
  } catch (err) {
    console.error('DELETE /comment error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/posts/:postId/comments/:commentId/replies — add reply to a comment
router.post('/:postId/comments/:commentId/replies', async (req, res) => {
  try {
    const { authorId, authorName, authorPhotoURL, text } = req.body
    if (!authorId || !authorName) return res.status(400).json({ error: 'Author info required' })
    if (!text?.trim()) return res.status(400).json({ error: 'Reply text is required' })

    const post = await Post.findById(req.params.postId)
    if (!post) return res.status(404).json({ error: 'Post not found' })

    // Recursively find a comment by id
    function findComment(list, id) {
      for (const c of list) {
        if (c._id.toString() === id) return c
        if (c.replies?.length) {
          const found = findComment(c.replies, id)
          if (found) return found
        }
      }
      return null
    }

    const parent = findComment(post.comments, req.params.commentId)
    if (!parent) return res.status(404).json({ error: 'Comment not found' })

    const reply = {
      _id: new mongoose.Types.ObjectId(),
      authorId,
      author: authorName,
      authorPhotoURL: authorPhotoURL || '',
      text: text.trim(),
      replies: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    if (!parent.replies) parent.replies = []
    parent.replies.push(reply)

    post.markModified('comments')
    await post.save()

    // Notify the parent comment author about the reply
    if (parent.authorId !== authorId) {
      notifyComment({ post, commenterUid: authorId, commenterName: authorName, commenterPhotoURL: authorPhotoURL })
    }

    res.status(201).json(post.toJSON())
  } catch (err) {
    console.error('POST /replies error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/posts/:id/rate — add or update rating (value=0 removes)
router.post('/:id/rate', async (req, res) => {
  try {
    const { raterId, raterName, rating } = req.body
    if (!raterId) return res.status(400).json({ error: 'raterId is required' })
    const value = Number(rating)
    if (!Number.isFinite(value) || value < 0 || value > 5)
      return res.status(400).json({ error: 'Rating must be 0-5' })

    const post = await Post.findById(req.params.id)
    if (!post) return res.status(404).json({ error: 'Post not found' })
    if (post.type === 'social') {
      return res.status(400).json({ error: 'This post does not accept ratings' })
    }

    // Mentioned people are not allowed to rate
    const mentionedLower = (post.mentionedNames ?? []).map((n) => n.toLowerCase())
    const raterLower = (raterName || '').toLowerCase()
    if (mentionedLower.some((m) => raterLower.includes(m) || m.includes(raterLower))) {
      return res.status(403).json({ error: 'Mentioned people cannot rate this post' })
    }

    // Remove existing rating by this user
    post.ratings = post.ratings.filter((r) => r.raterId !== raterId)

    // Value 0 means "remove rating", so only push if > 0
    if (value > 0) {
      post.ratings.push({ raterId, raterName: raterName || '', value })
    }

    await post.save()

    // Notify post author about the rating (only when adding, not removing)
    if (value > 0) {
      notifyRating({ post, raterUid: raterId, raterName })
    }

    res.json(post.toJSON())
  } catch (err) {
    console.error('POST /rate error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/posts/:id/like — toggle like
router.post('/:id/like', async (req, res) => {
  try {
    const { userId } = req.body
    if (!userId) return res.status(400).json({ error: 'userId is required' })

    const post = await Post.findById(req.params.id)
    if (!post) return res.status(404).json({ error: 'Post not found' })

    const likes = new Set(post.likes ?? [])
    if (likes.has(userId)) {
      likes.delete(userId)
    } else {
      likes.add(userId)
    }
    post.likes = [...likes]
    await post.save()

    res.json(post.toJSON())
  } catch (err) {
    console.error('POST /like error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
