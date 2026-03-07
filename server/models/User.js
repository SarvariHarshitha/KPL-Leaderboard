import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
  {
    firebaseUid: { type: String, required: true, unique: true },
    displayName: { type: String, default: '' },
    email: { type: String, default: '' },
    photoURL: { type: String, default: '' },
    bio: { type: String, default: '' },
    birthday: { type: String, default: '' },
  },
  { timestamps: true },
)

export default mongoose.model('User', userSchema)
