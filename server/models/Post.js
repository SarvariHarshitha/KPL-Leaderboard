import mongoose from 'mongoose'

const ratingSchema = new mongoose.Schema(
  {
    raterId: { type: String, required: true },
    raterName: { type: String, default: '' },
    value: { type: Number, required: true, min: 1, max: 5 },
  },
  { timestamps: true },
)

const commentSchema = new mongoose.Schema(
  {
    authorId: { type: String, required: true },
    author: { type: String, required: true },
    authorPhotoURL: { type: String, default: '' },
    text: { type: String, required: true },
  },
  { timestamps: true },
)

const postSchema = new mongoose.Schema(
  {
    authorId: { type: String, required: true },
    author: { type: String, required: true },
    authorPhotoURL: { type: String, default: '' },
    text: { type: String, required: true },
    mentionedNames: [String],
    comments: [commentSchema],
    ratings: [ratingSchema],
  },
  { timestamps: true },
)

// Virtual: average rating for a post
postSchema.virtual('averageRating').get(function () {
  if (!this.ratings.length) return 0
  const sum = this.ratings.reduce((acc, r) => acc + r.value, 0)
  return sum / this.ratings.length
})

postSchema.set('toJSON', { virtuals: true })
postSchema.set('toObject', { virtuals: true })

export default mongoose.model('Post', postSchema)
