import './App.css'
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { useCallback, useEffect, useRef, useState } from 'react'
import LeaderboardPage from './pages/LeaderboardPage.jsx'
import PostsPage from './pages/PostsPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import { useAuth } from './lib/useAuth.js'
import HomePage from './pages/HomePage.jsx'
import { fetchNotifications, markNotificationsRead, deleteNotification, deleteAllNotifications, fetchUsers } from './lib/api.js'
import TrashIcon from './components/TrashIcon.jsx'
import { ensureServiceWorker, getNotificationPermission, requestNotificationPermission, showLocalNotification, subscribePermissionListener } from './lib/pwa.js'

function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <div className="container"><div className="card">Loading…</div></div>
  if (!user) return <Navigate to="/" replace state={{ from: location }} />
  return children
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const secs = Math.floor(diff / 1000)
  if (secs < 60) return 'just now'
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function NotificationBell({ uid }) {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)
  const panelRef = useRef(null)
  const navigate = useNavigate()

  const unreadCount = notifications.filter((n) => !n.read).length

  const load = useCallback(async () => {
    if (!uid) return
    try {
      setLoading(true)
      const data = await fetchNotifications(uid)
      setNotifications(data)
    } catch (err) {
      console.error('Failed to fetch notifications', err)
    } finally {
      setLoading(false)
    }
  }, [uid])

  // Poll every 30 seconds + initial load
  useEffect(() => {
    load()
    const id = setInterval(load, 30000)
    return () => clearInterval(id)
  }, [load])

  // Close panel on outside click
  useEffect(() => {
    function handleClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const handleToggle = () => {
    setOpen((v) => !v)
    if (!open) load() // refresh when opening
  }

  const handleMarkAllRead = async () => {
    try {
      await markNotificationsRead(uid)
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    } catch (err) {
      console.error('Failed to mark all read', err)
    }
  }

  const handleDeleteOne = async (e, id) => {
    e.stopPropagation()
    try {
      await deleteNotification(id)
      setNotifications((prev) => prev.filter((n) => n._id !== id))
    } catch (err) {
      console.error('Failed to delete notification', err)
    }
  }

  const handleClearAll = async () => {
    try {
      await deleteAllNotifications(uid)
      setNotifications([])
    } catch (err) {
      console.error('Failed to clear notifications', err)
    }
  }

  const handleClickNotif = (notif) => {
    // Mark as read locally
    setNotifications((prev) =>
      prev.map((n) => (n._id === notif._id ? { ...n, read: true } : n)),
    )
    setOpen(false)
    if (notif.postId) {
      navigate('/posts')
    }
  }

  return (
    <div className="notif-wrapper" ref={panelRef}>
      <button
        className="btn btn--ghost notif-bell"
        type="button"
        aria-label="Notifications"
        onClick={handleToggle}
      >
        🔔
        {unreadCount > 0 && <span className="notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}
      </button>

      {open && (
        <>
          <div className="notif-backdrop" onClick={() => setOpen(false)} />
          <div className="notif-panel">
            <div className="notif-panel__header">
              <span className="notif-panel__title">Notifications</span>
              <span className="notif-panel__actions">
                {unreadCount > 0 && (
                  <button className="btn btn--ghost notif-panel__mark" type="button" onClick={handleMarkAllRead}>
                    Mark all read
                  </button>
                )}
                {notifications.length > 0 && (
                  <button className="btn btn--ghost notif-panel__mark notif-panel__clear" type="button" onClick={handleClearAll}>
                    Clear all
                  </button>
                )}
              </span>
            </div>

            <div className="notif-panel__list">
              {loading && notifications.length === 0 && (
                <div className="notif-empty">Loading…</div>
              )}
              {!loading && notifications.length === 0 && (
                <div className="notif-empty">No notifications yet</div>
              )}
              {notifications.map((n) => (
                <div
                  key={n._id}
                  className={`notif-item${n.read ? '' : ' notif-item--unread'}`}
                >
                  <button
                    className="notif-item__main"
                    type="button"
                    onClick={() => handleClickNotif(n)}
                  >
                    <span className="notif-item__icon">
                      {n.type === 'mention' && '📣'}
                      {n.type === 'comment' && '💬'}
                      {n.type === 'rating' && '⭐'}
                      {n.type === 'new_post' && '📝'}
                    </span>
                    <span className="notif-item__body">
                      <span className="notif-item__msg">{n.message}</span>
                      <span className="notif-item__time">{timeAgo(n.createdAt)}</span>
                    </span>
                  </button>
                  <button
                    className="btn btn--ghost notif-item__delete"
                    type="button"
                    title="Delete notification"
                    onClick={(e) => handleDeleteOne(e, n._id)}
                  >
                    <TrashIcon size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function UserSearch() {
  const [query, setQuery] = useState('')
  const [allUsers, setAllUsers] = useState([])
  const [open, setOpen] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const wrapRef = useRef(null)
  const inputRef = useRef(null)
  const navigate = useNavigate()

  // Load users once on mount
  useEffect(() => {
    fetchUsers()
      .then(setAllUsers)
      .catch((err) => console.error('Failed to fetch users for search:', err))
  }, [])

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const filtered = query.trim().length === 0
    ? []
    : allUsers.filter((u) => {
        const q = query.toLowerCase()
        return (
          (u.nickname || '').toLowerCase().includes(q) ||
          (u.displayName || '').toLowerCase().includes(q) ||
          (u.email || '').toLowerCase().includes(q)
        )
      })

  function handleSelect(u) {
    const profileName = u.nickname || u.displayName || u.email
    navigate(`/profile/${encodeURIComponent(profileName)}`)
    setQuery('')
    setOpen(false)
    inputRef.current?.blur()
  }

  function handleKeyDown(e) {
    if (!open || filtered.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIdx((i) => (i + 1) % filtered.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIdx((i) => (i - 1 + filtered.length) % filtered.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      handleSelect(filtered[selectedIdx])
    } else if (e.key === 'Escape') {
      setOpen(false)
      inputRef.current?.blur()
    }
  }

  return (
    <div className="user-search" ref={wrapRef}>
      <div className="user-search__input-wrap">
        <span className="user-search__icon" aria-hidden="true">🔍</span>
        <input
          ref={inputRef}
          className="user-search__input"
          type="text"
          placeholder="Search users…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(e.target.value.trim().length > 0)
            setSelectedIdx(0)
          }}
          onFocus={() => { if (query.trim()) setOpen(true) }}
          onKeyDown={handleKeyDown}
        />
        {query && (
          <button
            className="user-search__clear"
            type="button"
            aria-label="Clear search"
            onClick={() => { setQuery(''); setOpen(false); inputRef.current?.focus() }}
          >
            ✕
          </button>
        )}
      </div>

      {open && filtered.length > 0 && (
        <ul className="user-search__dropdown">
          {filtered.map((u, idx) => (
            <li
              key={u._id}
              className={`user-search__item${idx === selectedIdx ? ' is-selected' : ''}`}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(u) }}
              onMouseEnter={() => setSelectedIdx(idx)}
            >
              {u.photoURL ? (
                <img className="avatar avatar--sm" src={u.photoURL} alt="" referrerPolicy="no-referrer" />
              ) : (
                <span className="avatar avatar--sm avatar--placeholder">
                  {(u.nickname || u.displayName || u.email || '?')[0].toUpperCase()}
                </span>
              )}
              <div className="user-search__info">
                <span className="user-search__name">{u.nickname || u.displayName || u.email}</span>
                {u.nickname && u.displayName && (
                  <span className="user-search__sub">{u.displayName}</span>
                )}
                {(u.nickname || u.displayName) && u.email && (
                  <span className="user-search__sub">{u.email}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {open && query.trim().length > 0 && filtered.length === 0 && (
        <div className="user-search__dropdown user-search__empty">No users found</div>
      )}
    </div>
  )
}

function NotificationOptIn() {
  const [permission, setPermission] = useState(() => getNotificationPermission())
  const [enabling, setEnabling] = useState(false)

  useEffect(() => {
    const unsubscribe = subscribePermissionListener((state) => setPermission(state))
    return unsubscribe
  }, [])

  if (permission === 'unsupported') return null
  if (permission === 'denied') {
    return <span className="notif-optin notif-optin__blocked muted small">Notifications blocked in browser</span>
  }
  if (permission === 'granted') return null

  const handleEnable = async () => {
    setEnabling(true)
    try {
      await ensureServiceWorker()
      const status = await requestNotificationPermission()
      setPermission(status)
      if (status === 'granted') {
        await showLocalNotification('Notifications enabled', {
          body: 'We will alert you about mentions, posts, and leaderboard updates.',
        })
      }
    } catch (err) {
      console.error('Failed to enable notifications', err)
    } finally {
      setEnabling(false)
    }
  }

  return (
    <button
      className="btn btn--ghost notif-optin"
      type="button"
      onClick={handleEnable}
      disabled={enabling}
    >
      {enabling ? 'Enabling…' : 'Enable alerts'}
    </button>
  )
}

function App() {
  const { user, loading, loginWithGoogle, logout } = useAuth()
  const [darkMode, setDarkMode] = useState(() => {
    const raw = localStorage.getItem('kpl:theme')
    if (raw === 'dark') return true
    if (raw === 'light') return false
    return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? false
  })

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? 'dark' : 'light'
    localStorage.setItem('kpl:theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar__inner">
          <Link to="/" className="brand">
            Katwana Premier League <span className="brand__tag">KPL</span>
          </Link>

          <nav className="nav">
            {user ? (
              <>
                <NavLink
                  to="/posts"
                  className={({ isActive }) => (isActive ? 'nav__link is-active' : 'nav__link')}
                >
                  Posts
                </NavLink>
                <NavLink
                  to="/leaderboard"
                  className={({ isActive }) => (isActive ? 'nav__link is-active' : 'nav__link')}
                >
                  Leaderboard
                </NavLink>
              </>
            ) : (
              <NavLink to="/" end className={({ isActive }) => (isActive ? 'nav__link is-active' : 'nav__link')}>
                Home
              </NavLink>
            )}
          </nav>

          {user && <UserSearch />}

          <div className="auth">
            {user && <NotificationOptIn />}
            {user && <NotificationBell uid={user.uid} />}
            <button
              className="btn btn--ghost theme-toggle"
              type="button"
              aria-pressed={darkMode}
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              onClick={() => setDarkMode((v) => !v)}
              title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
            {loading ? (
              <span className="muted small">Loading…</span>
            ) : user ? (
              <>
                <Link
                  to={`/profile/${encodeURIComponent(user.nickname || user.displayName || user.email)}`}
                  className="auth__avatar-link"
                  title={user.nickname || user.displayName || user.email}
                >
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.nickname || user.displayName || user.email}
                      className="auth__avatar"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="auth__avatar auth__avatar--placeholder">
                      {(user.nickname || user.displayName || user.email || '?').charAt(0).toUpperCase()}
                    </span>
                  )}
                </Link>
                <button className="btn btn--ghost" type="button" onClick={() => logout()}>
                  Logout
                </button>
              </>
            ) : (
              <button className="btn" type="button" onClick={() => loginWithGoogle()}>
                Sign in with Google
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="container">
        <Routes>
          <Route path="/" element={<HomePage onSignIn={() => loginWithGoogle()} />} />
          <Route
            path="/posts"
            element={
              <RequireAuth>
                <PostsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/leaderboard"
            element={
              <RequireAuth>
                <LeaderboardPage />
              </RequireAuth>
            }
          />
          <Route
            path="/profile/:name"
            element={
              <RequireAuth>
                <ProfilePage />
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <footer className="footer">
        <div className="container footer__inner">
          <span>
            Tip: sign in, then mention friends with @Name. Post ratings add to mentioned people on the leaderboard.
          </span>
        </div>
      </footer>
    </div>
  )
}

export default App
