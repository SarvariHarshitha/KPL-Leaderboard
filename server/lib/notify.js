import Notification from '../models/Notification.js'
import User from '../models/User.js'

/**
 * Create notifications for relevant users.
 * Does not throw — errors are logged silently.
 */

export async function notifyMentioned({ mentionedNames, authorName, authorPhotoURL, postId }) {
  try {
    if (!mentionedNames?.length) return
    // Find users whose first name matches a mention
    const allUsers = await User.find({}, 'firebaseUid displayName').lean()

    for (const mention of mentionedNames) {
      const mentionLower = mention.toLowerCase()
      const matchedUser = allUsers.find((u) => {
        const dn = (u.displayName || '').toLowerCase()
        const first = dn.split(/\s+/)[0]
        return first === mentionLower || dn === mentionLower
      })
      if (matchedUser) {
        await Notification.create({
          recipientUid: matchedUser.firebaseUid,
          type: 'mention',
          message: `${authorName} mentioned you in a post`,
          fromUser: authorName,
          fromPhotoURL: authorPhotoURL || '',
          postId,
        })
      }
    }
  } catch (err) {
    console.error('notifyMentioned error:', err)
  }
}

export async function notifyComment({ post, commenterName, commenterPhotoURL }) {
  try {
    // Don't notify if commenter is the post author
    if (post.authorId === undefined) return
    const commenterLower = (commenterName || '').toLowerCase()
    const postAuthorLower = (post.author || '').toLowerCase()
    if (commenterLower === postAuthorLower) return

    await Notification.create({
      recipientUid: post.authorId,
      type: 'comment',
      message: `${commenterName} commented on your post`,
      fromUser: commenterName,
      fromPhotoURL: commenterPhotoURL || '',
      postId: post._id,
    })
  } catch (err) {
    console.error('notifyComment error:', err)
  }
}

export async function notifyRating({ post, raterName }) {
  try {
    // Don't notify if rater is the post author
    const raterLower = (raterName || '').toLowerCase()
    const postAuthorLower = (post.author || '').toLowerCase()
    if (raterLower === postAuthorLower) return

    await Notification.create({
      recipientUid: post.authorId,
      type: 'rating',
      message: `${raterName} rated your post`,
      fromUser: raterName,
      fromPhotoURL: '',
      postId: post._id,
    })
  } catch (err) {
    console.error('notifyRating error:', err)
  }
}
