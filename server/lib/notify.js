import Notification from '../models/Notification.js'
import User from '../models/User.js'

/**
 * Resolve a firebaseUid to the user's nickname or displayName.
 */
async function resolveNickname(firebaseUid) {
  if (!firebaseUid) return null
  const u = await User.findOne({ firebaseUid }, 'nickname displayName').lean()
  return u ? (u.nickname || u.displayName || '') : null
}

/**
 * Create notifications for relevant users.
 * Does not throw — errors are logged silently.
 */

export async function notifyMentioned({ mentionedNames, authorUid, authorName, authorPhotoURL, postId }) {
  try {
    if (!mentionedNames?.length) return
    // Resolve author nickname
    const resolvedAuthor = (await resolveNickname(authorUid)) || authorName

    // Find users whose first name or nickname matches a mention
    const allUsers = await User.find({}, 'firebaseUid displayName nickname').lean()

    for (const mention of mentionedNames) {
      const mentionLower = mention.toLowerCase()
      const matchedUser = allUsers.find((u) => {
        const dn = (u.displayName || '').toLowerCase()
        const nn = (u.nickname || '').toLowerCase()
        const first = dn.split(/\s+/)[0]
        return first === mentionLower || dn === mentionLower || nn === mentionLower
      })
      if (matchedUser) {
        await Notification.create({
          recipientUid: matchedUser.firebaseUid,
          type: 'mention',
          message: `${resolvedAuthor} mentioned you in a post`,
          fromUser: resolvedAuthor,
          fromPhotoURL: authorPhotoURL || '',
          postId,
        })
      }
    }
  } catch (err) {
    console.error('notifyMentioned error:', err)
  }
}

export async function notifyComment({ post, commenterUid, commenterName, commenterPhotoURL }) {
  try {
    // Don't notify if commenter is the post author
    if (post.authorId === undefined) return
    if (commenterUid && commenterUid === post.authorId) return

    // Resolve commenter nickname
    const resolvedCommenter = (await resolveNickname(commenterUid)) || commenterName

    // Fallback: compare names if uids not available
    const commenterLower = (resolvedCommenter || '').toLowerCase()
    const postAuthorLower = (post.author || '').toLowerCase()
    if (!commenterUid && commenterLower === postAuthorLower) return

    await Notification.create({
      recipientUid: post.authorId,
      type: 'comment',
      message: `${resolvedCommenter} commented on your post`,
      fromUser: resolvedCommenter,
      fromPhotoURL: commenterPhotoURL || '',
      postId: post._id,
    })
  } catch (err) {
    console.error('notifyComment error:', err)
  }
}

export async function notifyRating({ post, raterUid, raterName }) {
  try {
    // Don't notify if rater is the post author
    if (raterUid && raterUid === post.authorId) return

    // Resolve rater nickname
    const resolvedRater = (await resolveNickname(raterUid)) || raterName

    const raterLower = (resolvedRater || '').toLowerCase()
    const postAuthorLower = (post.author || '').toLowerCase()
    if (!raterUid && raterLower === postAuthorLower) return

    await Notification.create({
      recipientUid: post.authorId,
      type: 'rating',
      message: `${resolvedRater} rated your post`,
      fromUser: resolvedRater,
      fromPhotoURL: '',
      postId: post._id,
    })
  } catch (err) {
    console.error('notifyRating error:', err)
  }
}
