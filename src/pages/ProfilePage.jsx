import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { fetchProfile, updateProfile } from '../lib/api.js'
import { useAuth } from '../lib/useAuth.js'

function StatCard({ label, value, sub }) {
  return (
    <div className="profile-stat">
      <div className="profile-stat__value">{value}</div>
      <div className="profile-stat__label">{label}</div>
      {sub && <div className="profile-stat__sub">{sub}</div>}
    </div>
  )
}

function PostPreview({ post }) {
  const avg = (() => {
    const ratings = post.ratings ?? []
    if (!ratings.length) return 0
    return Math.round((ratings.reduce((s, r) => s + r.value, 0) / ratings.length) * 10) / 10
  })()

  return (
    <div className="profile-post">
      <div className="profile-post__top">
        <Link to={`/profile/${encodeURIComponent(post.author)}`} className="profile-post__author">
          {post.author}
        </Link>
        <span className="dot">•</span>
        <span className="muted small">{new Date(post.createdAt).toLocaleDateString()}</span>
        <span style={{ marginLeft: 'auto' }} className="stars small">★ {avg}</span>
      </div>
      <div className="profile-post__text">{post.text.length > 120 ? post.text.slice(0, 120) + '…' : post.text}</div>
      {(post.mentionedNames ?? []).length > 0 && (
        <div className="profile-post__mentions">
          {post.mentionedNames.map((n) => (
            <Link key={n} to={`/profile/${encodeURIComponent(n)}`} className="pill pill--mention">@{n}</Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ProfilePage() {
  const { name } = useParams()
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('posts')

  // Edit state
  const [editing, setEditing] = useState(false)
  const [nickname, setNickname] = useState('')
  const [bio, setBio] = useState('')
  const [birthday, setBirthday] = useState('')
  const [saving, setSaving] = useState(false)

  const isOwner = user && data?.user?.firebaseUid === user.uid

  useEffect(() => {
    setLoading(true)
    setError('')
    fetchProfile(name)
      .then((d) => {
        setData(d)
        setNickname(d.user.nickname || '')
        setBio(d.user.bio || '')
        setBirthday(d.user.birthday || '')
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [name])

  async function handleSave() {
    if (!user) return
    setSaving(true)
    try {
      const updated = await updateProfile(user.uid, { nickname, bio, birthday })
      setData((prev) => ({ ...prev, user: { ...prev.user, nickname: updated.nickname || '', bio: updated.bio, birthday: updated.birthday } }))
      setEditing(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="stack">
        <section className="card"><div className="muted">Loading profile…</div></section>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="stack">
        <section className="card"><div className="alert">{error || 'Profile not found'}</div></section>
      </div>
    )
  }

  const { user: profileUser, stats, authoredPosts, mentionedPosts, userComments } = data

  return (
    <div className="stack">
      {/* Profile header */}
      <section className="profile-header">
        <div className="profile-header__top">
          {profileUser.photoURL ? (
            <img className="profile-avatar" src={profileUser.photoURL} alt="" />
          ) : (
            <span className="profile-avatar profile-avatar--placeholder">
              {(profileUser.nickname || profileUser.displayName || '?')[0]}
            </span>
          )}
          <div className="profile-header__info">
            <h1 className="profile-header__name">{profileUser.nickname || profileUser.displayName}</h1>
            {profileUser.nickname && (
              <div className="muted small">{profileUser.displayName}</div>
            )}
            <div className="muted small">{profileUser.email}</div>
            {profileUser.birthday && (
              <div className="muted small">🎂 {profileUser.birthday}</div>
            )}
            {profileUser.bio && !editing && (
              <div className="profile-header__bio">{profileUser.bio}</div>
            )}
            <div className="muted small">Joined {new Date(profileUser.createdAt).toLocaleDateString()}</div>
          </div>
          {isOwner && !editing && (
            <button className="btn btn--ghost" type="button" onClick={() => setEditing(true)} style={{ alignSelf: 'flex-start' }}>
              ✏️ Edit
            </button>
          )}
        </div>

        {/* Edit form */}
        {editing && (
          <div className="profile-edit">
            <label className="profile-edit__label">
              <span className="muted small">Nickname</span>
              <input
                className="input"
                type="text"
                placeholder="Enter a nickname…"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={30}
              />
            </label>
            <label className="profile-edit__label">
              <span className="muted small">Bio</span>
              <textarea
                className="textarea"
                rows={3}
                placeholder="Tell your friends something about yourself…"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={300}
              />
            </label>
            <label className="profile-edit__label">
              <span className="muted small">Birthday</span>
              <input
                className="input"
                type="date"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
              />
            </label>
            <div className="row" style={{ gap: 8 }}>
              <button className="btn" type="button" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button className="btn btn--ghost" type="button" onClick={() => { setEditing(false); setNickname(data.user.nickname || ''); setBio(data.user.bio || ''); setBirthday(data.user.birthday || '') }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Stats cards */}
      <section className="profile-stats">
        <StatCard label="Overall Score" value={stats.overallScore} sub={stats.overallRank ? `Rank #${stats.overallRank}` : 'Unranked'} />
        <StatCard label="Monthly Score" value={stats.monthlyScore} sub={new Date().toLocaleString('default', { month: 'long', year: 'numeric' })} />
        <StatCard label="Mentions" value={stats.totalMentions} />
        <StatCard label="Posts" value={stats.totalPosts} />
        <StatCard label="Comments" value={stats.totalComments} />
      </section>

      {/* Tabs */}
      <section className="profile-tabs">
        <div className="profile-tabs__bar">
          {[
            { key: 'posts', label: `Posts (${authoredPosts.length})` },
            { key: 'mentioned', label: `Mentioned In (${mentionedPosts.length})` },
            { key: 'comments', label: `Comments (${userComments.length})` },
          ].map((t) => (
            <button
              key={t.key}
              className={`profile-tab ${tab === t.key ? 'profile-tab--active' : ''}`}
              type="button"
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="profile-tabs__content">
          {tab === 'posts' && (
            authoredPosts.length === 0
              ? <div className="muted">No posts yet.</div>
              : authoredPosts.map((p) => <PostPreview key={p._id} post={p} />)
          )}

          {tab === 'mentioned' && (
            mentionedPosts.length === 0
              ? <div className="muted">Not mentioned in any posts yet.</div>
              : mentionedPosts.map((p) => <PostPreview key={p._id} post={p} />)
          )}

          {tab === 'comments' && (
            userComments.length === 0
              ? <div className="muted">No comments yet.</div>
              : userComments.map((c) => (
                  <div key={c._id} className="profile-comment">
                    <div className="profile-comment__top">
                      <span className="muted small">on a post by</span>
                      <Link to={`/profile/${encodeURIComponent(c.postAuthor)}`} className="profile-comment__link">
                        {c.postAuthor}
                      </Link>
                      <span className="dot">•</span>
                      <span className="muted small">{new Date(c.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="profile-comment__text">{c.text}</div>
                    <div className="muted small" style={{ marginTop: 4 }}>
                      Post: "{c.postText}{c.postText.length >= 80 ? '…' : ''}"
                    </div>
                  </div>
                ))
          )}
        </div>
      </section>
    </div>
  )
}
