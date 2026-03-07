import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

// Load .env from project root (parent of server/) — optional in production
const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '..', '.env') })

import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'

import authRoutes from './routes/auth.js'
import postRoutes from './routes/posts.js'
import leaderboardRoutes from './routes/leaderboard.js'
import profileRoutes from './routes/profile.js'

const PORT = process.env.PORT || 4000
const MONGODB_URI = process.env.MONGODB_URI

if (!MONGODB_URI) {
  console.error('❌  MONGODB_URI is missing. Add it to the .env file in the project root.')
  process.exit(1)
}

// Connect to MongoDB
mongoose
  .connect(MONGODB_URI)
  .then(() => console.log('✅  Connected to MongoDB'))
  .catch((err) => {
    console.error('❌  MongoDB connection error:', err.message)
    process.exit(1)
  })

const app = express()

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim())
  : true  // allow all origins when not configured

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}))
app.use(express.json())

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/posts', postRoutes)
app.use('/api/leaderboard', leaderboardRoutes)
app.use('/api/profile', profileRoutes)

// Health check
app.get('/api/health', (_req, res) => res.json({ ok: true }))

app.listen(PORT, () => {
  console.log(`🚀  KPL API server running on http://localhost:${PORT}`)
})
