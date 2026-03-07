import { Router } from 'express'
import User from '../models/User.js'

const router = Router()

// POST /api/auth/sync — upsert user after Google sign-in
router.post('/sync', async (req, res) => {
  try {
    const { firebaseUid, displayName, email, photoURL } = req.body
    if (!firebaseUid) return res.status(400).json({ error: 'firebaseUid is required' })

    const user = await User.findOneAndUpdate(
      { firebaseUid },
      { displayName, email, photoURL },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    )

    res.json(user)
  } catch (err) {
    console.error('auth/sync error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/auth/users — list all registered users (for @mention autocomplete)
router.get('/users', async (_req, res) => {
  try {
    const users = await User.find({}, 'displayName email photoURL').sort({ displayName: 1 }).lean()
    res.json(users)
  } catch (err) {
    console.error('auth/users error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
