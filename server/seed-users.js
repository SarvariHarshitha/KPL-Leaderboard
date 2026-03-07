import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import User from './models/User.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '..', '.env') })

const MONGODB_URI = process.env.MONGODB_URI

const dummyUsers = [
  {
    firebaseUid: 'dummy_uid_ananya_01',
    displayName: 'Ananya Sharma',
    email: 'ananya.sharma@gmail.com',
    photoURL: 'https://ui-avatars.com/api/?name=Ananya+Sharma&background=FF6B6B&color=fff&size=128',
  },
  {
    firebaseUid: 'dummy_uid_rahul_02',
    displayName: 'Rahul Verma',
    email: 'rahul.verma@gmail.com',
    photoURL: 'https://ui-avatars.com/api/?name=Rahul+Verma&background=4ECDC4&color=fff&size=128',
  },
  {
    firebaseUid: 'dummy_uid_priya_03',
    displayName: 'Priya Reddy',
    email: 'priya.reddy@gmail.com',
    photoURL: 'https://ui-avatars.com/api/?name=Priya+Reddy&background=45B7D1&color=fff&size=128',
  },
  {
    firebaseUid: 'dummy_uid_arjun_04',
    displayName: 'Arjun Patel',
    email: 'arjun.patel@gmail.com',
    photoURL: 'https://ui-avatars.com/api/?name=Arjun+Patel&background=96CEB4&color=fff&size=128',
  },
  {
    firebaseUid: 'dummy_uid_sneha_05',
    displayName: 'Sneha Iyer',
    email: 'sneha.iyer@gmail.com',
    photoURL: 'https://ui-avatars.com/api/?name=Sneha+Iyer&background=FFEAA7&color=333&size=128',
  },
  {
    firebaseUid: 'dummy_uid_karthik_06',
    displayName: 'Karthik Nair',
    email: 'karthik.nair@gmail.com',
    photoURL: 'https://ui-avatars.com/api/?name=Karthik+Nair&background=DDA0DD&color=fff&size=128',
  },
  {
    firebaseUid: 'dummy_uid_meera_07',
    displayName: 'Meera Joshi',
    email: 'meera.joshi@gmail.com',
    photoURL: 'https://ui-avatars.com/api/?name=Meera+Joshi&background=FF8C94&color=fff&size=128',
  },
  {
    firebaseUid: 'dummy_uid_vikram_08',
    displayName: 'Vikram Singh',
    email: 'vikram.singh@gmail.com',
    photoURL: 'https://ui-avatars.com/api/?name=Vikram+Singh&background=6C5CE7&color=fff&size=128',
  },
]

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI)
    console.log('✅ Connected to MongoDB')

    for (const u of dummyUsers) {
      const result = await User.findOneAndUpdate(
        { firebaseUid: u.firebaseUid },
        u,
        { upsert: true, new: true },
      )
      console.log(`  → ${result.displayName} (${result.email})`)
    }

    console.log(`\n🎉 Seeded ${dummyUsers.length} dummy users!`)
  } catch (err) {
    console.error('❌ Seed failed:', err.message)
  } finally {
    await mongoose.disconnect()
    process.exit(0)
  }
}

seed()
