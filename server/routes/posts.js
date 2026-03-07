import { Router } from 'express'
import Post from '../models/Post.js'
import User from '../models/User.js'

const router = Router()

// Helper: extract @mentions from text
function extractMentionedNames(text) {
  const t = String(text ?? '')
  const matches = t.match(/@([\p{L}\p{N}_]{2,})/gu) ?? []
  return [...new Set(matches.map((m) => m.slice(1).trim()).filter(Boolean))]
}

// GET /api/posts — list all posts (newest first)
router.get('/', async (_req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 }).lean({ virtuals: true })
    res.json(posts)
  } catch (err) {
    console.error('GET /posts error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/posts — create post
router.post('/', async (req, res) => {
  try {
    const { authorId, authorName, authorPhotoURL, text } = req.body
    if (!authorId || !authorName) return res.status(400).json({ error: 'Author info required' })
    if (!text?.trim()) return res.status(400).json({ error: 'Post text is required' })

    const post = await Post.create({
      authorId,
      author: authorName,
      authorPhotoURL: authorPhotoURL || '',
      text: text.trim(),
      mentionedNames: extractMentionedNames(text),
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

    const comment = post.comments.id(req.params.commentId)
    if (!comment) return res.status(404).json({ error: 'Comment not found' })

    // Check if user is admin or the comment author
    const reqUser = await User.findOne({ firebaseUid: userId }).lean()
    const isAdmin = reqUser?.role === 'admin'
    const isAuthor = comment.authorId === userId

    if (!isAdmin && !isAuthor) {
      return res.status(403).json({ error: 'Only the author or an admin can delete this comment' })
    }

    post.comments = post.comments.filter((c) => c._id.toString() !== req.params.commentId)
    await post.save()

    res.json(post.toJSON())
  } catch (err) {
    console.error('DELETE /comment error:', err)
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
    res.json(post.toJSON())
  } catch (err) {
    console.error('POST /rate error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
