import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import User from './models/User.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '..', '.env') })

const MONGODB_URI = process.env.MONGODB_URI

async function run() {
  try {
    await mongoose.connect(MONGODB_URI)
    console.log('✅ Connected to MongoDB')

    const result = await User.findOneAndUpdate(
      { firebaseUid: 'NgCT6IX8DIhhR6V5IS80Opnl9rR2' },
      { role: 'admin' },
      { new: true },
    )

    if (result) {
      console.log(`🔑 ${result.displayName} is now an admin!`)
    } else {
      console.log('❌ User not found')
    }
  } catch (err) {
    console.error('❌ Error:', err.message)
  } finally {
    await mongoose.disconnect()
    process.exit(0)
  }
}

run()
