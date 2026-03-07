import { Router } from 'express'
import Notification from '../models/Notification.js'

const router = Router()

// GET /api/notifications?uid=xxx — get notifications for a user
router.get('/', async (req, res) => {
  try {
    const { uid } = req.query
    if (!uid) return res.status(400).json({ error: 'uid is required' })

    const notifs = await Notification.find({ recipientUid: uid })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean()

    res.json(notifs)
  } catch (err) {
    console.error('GET /notifications error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// PATCH /api/notifications/read — mark notifications as read
router.patch('/read', async (req, res) => {
  try {
    const { uid } = req.body
    if (!uid) return res.status(400).json({ error: 'uid is required' })

    await Notification.updateMany(
      { recipientUid: uid, read: false },
      { read: true },
    )

    res.json({ ok: true })
  } catch (err) {
    console.error('PATCH /notifications/read error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/notifications/unread-count?uid=xxx
router.get('/unread-count', async (req, res) => {
  try {
    const { uid } = req.query
    if (!uid) return res.status(400).json({ error: 'uid is required' })

    const count = await Notification.countDocuments({ recipientUid: uid, read: false })
    res.json({ count })
  } catch (err) {
    console.error('GET /notifications/unread-count error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
