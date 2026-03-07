import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useKpl } from '../lib/useKpl.js'
import { extractMentionedNames } from '../lib/kplStore.js'
import { useAuth } from '../lib/useAuth.js'
import MentionTextarea from '../components/MentionTextarea.jsx'

function getPostAverageRating(post) {
  const ratings = post.ratings ?? []
  if (!ratings.length) return 0
  const sum = ratings.reduce((acc, r) => acc + Number(r.value || 0), 0)
  return sum / ratings.length
}

function Stars({ value }) {
  const rounded = Math.round((Number(value) || 0) * 10) / 10
  return (
    <span className="stars" title={`${rounded} avg`}>
      ★ {rounded || 0}
    </span>
  )
}

function RatingBar({ postId, currentUserLabel, defaultRating = 5, disabled, onRate }) {
  const [rating, setRating] = useState(defaultRating)

  return (
    <form
      className="rating"
      onSubmit={(e) => {
        e.preventDefault()
        onRate({ postId, rating })
      }}
    >
      <div className="muted small" style={{ alignSelf: 'center' }}>
        {currentUserLabel}
      </div>
      <select className="select" value={rating} onChange={(e) => setRating(Number(e.target.value))}>
        {[5, 4, 3, 2, 1, 0].map((n) => (
          <option key={n} value={n}>
            {n === 0 ? 'Remove' : n}
          </option>
        ))}
      </select>
      <button className="btn" type="submit" disabled={disabled}>
        Rate
      </button>
    </form>
  )
}

function CommentComposer({ postId, disabled, onAdd }) {
  const [text, setText] = useState('')

  return (
    <form
      className="commentComposer"
      onSubmit={(e) => {
        e.preventDefault()
        onAdd({ postId, text })
        setText('')
      }}
    >
      <input
        className="input"
        placeholder={disabled ? 'Sign in to comment' : 'Write a comment'}
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={disabled}
      />
      <button className="btn btn--ghost" type="submit" disabled={disabled}>
        Comment
      </button>
    </form>
  )
}

export default function PostsPage() {
  const { state, addPost, addComment, deletePost, deleteComment, ratePost } = useKpl()
  const { user } = useAuth()
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const dialogRef = useRef(null)

  const posts = state.posts

  const hintNames = useMemo(() => extractMentionedNames(text), [text])

  function openDialog() {
    setError('')
    setDialogOpen(true)
    requestAnimationFrame(() => dialogRef.current?.showModal())
  }

  function closeDialog() {
    setDialogOpen(false)
    dialogRef.current?.close()
  }

  function handleDialogClick(e) {
    if (e.target === dialogRef.current) closeDialog()
  }

  return (
    <div className="stack">
      <section className="hero">
        <div>
          <h1 className="h1">KPL Posts</h1>
          <p className="muted">
            Create a post, tag friends like <code>@Asha</code>, and let others rate it. Each post’s average rating gets
            added to the tagged friends’ total.
          </p>
        </div>
      </section>

      <section className="stack">
        {posts.length === 0 ? (
          <div className="empty">No posts yet. Be the first to publish for KPL.</div>
        ) : (
          posts.map((post) => {
            const avg = getPostAverageRating(post)
            const mentionedLower = (post.mentionedNames ?? []).map((n) => n.toLowerCase())
            const userName = (user?.displayName || user?.email || '').toLowerCase()
            const userFirstName = userName.split(/\s+/)[0]
            const isMentioned = user && mentionedLower.some(
              (m) => m === userFirstName || m === userName,
            )
            return (
              <article key={post._id} className="post">
                <div className="post__top">
                  <div>
                    <div className="post__meta">
                      {post.authorPhotoURL ? (
                        <img className="avatar" src={post.authorPhotoURL} alt="" />
                      ) : (
                        <span className="avatar avatar--placeholder">{(post.author || '?')[0]}</span>
                      )}
                      <Link to={`/profile/${encodeURIComponent(post.author)}`} className="post__author post__author--link">{post.author}</Link>
                      <span className="dot">•</span>
                      <span className="muted">{new Date(post.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="post__text">{post.text}</div>
                    <div className="post__mentions">
                      {(post.mentionedNames ?? []).length ? (
                        (post.mentionedNames ?? []).map((n) => (
                          <Link key={n} to={`/profile/${encodeURIComponent(n)}`} className="pill pill--mention pill--link">
                            @{n}
                          </Link>
                        ))
                      ) : (
                        <span className="muted">No mentions</span>
                      )}
                    </div>
                  </div>

                  <div className="post__score">
                    <Stars value={avg} />
                    <div className="muted small">{(post.ratings ?? []).length || 0} ratings</div>
                    <button
                      className="btn btn--ghost"
                      type="button"
                      onClick={() => {
                        if (!confirm('Delete this post?')) return
                        deletePost({ postId: post._id })
                      }}
                      style={{ marginTop: 10 }}
                      disabled={!user}
                      title="Delete post"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                <div className="post__actions">
                  <RatingBar
                    postId={post._id}
                    currentUserLabel={
                      isMentioned
                        ? 'You are mentioned — cannot rate'
                        : user
                          ? user.displayName || user.email
                          : 'Sign in to rate'
                    }
                    disabled={!user || isMentioned}
                    onRate={(payload) => {
                      setError('')
                      try {
                        if (!user) throw new Error('Please sign in to rate')
                        ratePost({
                          postId: payload.postId,
                          raterId: user.uid,
                          raterName: user.displayName || user.email,
                          rating: payload.rating,
                        })
                      } catch (err) {
                        setError(err.message)
                      }
                    }}
                  />
                </div>

                <div className="post__comments">
                  <div className="row row--space">
                    <h3 className="h3">Comments</h3>
                    <span className="muted small">{post.comments.length}</span>
                  </div>

                  {post.comments.length ? (
                    <ul className="commentList">
                      {post.comments.map((c) => (
                        <li key={c._id} className="comment">
                          <div className="comment__top">
                            {c.authorPhotoURL ? (
                              <img className="avatar avatar--sm" src={c.authorPhotoURL} alt="" />
                            ) : (
                              <span className="avatar avatar--sm avatar--placeholder">{(c.author || '?')[0]}</span>
                            )}
                            <Link to={`/profile/${encodeURIComponent(c.author)}`} className="comment__author comment__author--link">{c.author}</Link>
                            <span className="dot">•</span>
                            <span className="muted small">{new Date(c.createdAt).toLocaleString()}</span>
                            <span style={{ marginLeft: 'auto' }}>
                              <button
                                className="btn btn--ghost"
                                type="button"
                                onClick={() => deleteComment({ postId: post._id, commentId: c._id })}
                                disabled={!user || c.authorId !== user.uid}
                                title="Delete comment"
                              >
                                🗑️
                              </button>
                            </span>
                          </div>
                          <div className="comment__text">{c.text}</div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="muted">No comments yet.</div>
                  )}

                  <CommentComposer
                    postId={post._id}
                    disabled={!user}
                    onAdd={(payload) => {
                      setError('')
                      try {
                        if (!user) throw new Error('Please sign in to comment')
                        addComment({
                          postId: payload.postId,
                          authorId: user.uid,
                          authorName: user.displayName || user.email,
                          authorPhotoURL: user.photoURL || '',
                          text: payload.text,
                        })
                      } catch (err) {
                        setError(err.message)
                      }
                    }}
                  />
                </div>
              </article>
            )
          })
        )}
      </section>

      {/* Floating Action Button */}
      <button
        className="fab"
        type="button"
        title="New post"
        onClick={openDialog}
      >
        +
      </button>

      {/* New Post Dialog */}
      {dialogOpen && (
        <dialog ref={dialogRef} className="post-dialog" onClick={handleDialogClick}>
          <div className="post-dialog__inner">
            <div className="row row--space" style={{ marginBottom: 12 }}>
              <h2 className="h2" style={{ margin: 0 }}>New post</h2>
              <button className="btn btn--ghost" type="button" onClick={closeDialog}>✕</button>
            </div>

            {error ? <div className="alert">{error}</div> : null}

            <form
              className="composer"
              onSubmit={(e) => {
                e.preventDefault()
                setError('')
                try {
                  if (!user) throw new Error('Please sign in with Google to post')
                  addPost({ authorId: user.uid, authorName: user.displayName || user.email, authorPhotoURL: user.photoURL || '', text })
                  setText('')
                  closeDialog()
                } catch (err) {
                  setError(err.message)
                }
              }}
            >
              <input
                className="input"
                placeholder="Signed-in as"
                value={user ? user.displayName || user.email : ''}
                disabled
              />
              <MentionTextarea
                placeholder="Post text (type @ to mention friends)"
                value={text}
                onChange={(v) => setText(v)}
                rows={4}
              />
              <div className="row row--space">
                <div className="muted">
                  Mentions: {hintNames.length ? hintNames.map((n) => <span key={n} className="pill">{n}</span>) : '—'}
                </div>
                <button className="btn" type="submit">
                  Publish
                </button>
              </div>
            </form>
          </div>
        </dialog>
      )}
    </div>
  )
}
