import mongoose from 'mongoose'

const notificationSchema = new mongoose.Schema(
  {
    recipientUid: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: ['mention', 'comment', 'rating', 'post'],
      required: true,
    },
    message: { type: String, required: true },
    fromUser: { type: String, default: '' },
    fromPhotoURL: { type: String, default: '' },
    postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
    read: { type: Boolean, default: false },
  },
  { timestamps: true },
)

export default mongoose.model('Notification', notificationSchema)
