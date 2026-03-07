import './App.css'
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { useCallback, useEffect, useRef, useState } from 'react'
import LeaderboardPage from './pages/LeaderboardPage.jsx'
import PostsPage from './pages/PostsPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import { useAuth } from './lib/useAuth.js'
import HomePage from './pages/HomePage.jsx'
import { fetchNotifications, markNotificationsRead } from './lib/api.js'

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
        <div className="notif-panel">
          <div className="notif-panel__header">
            <span className="notif-panel__title">Notifications</span>
            {unreadCount > 0 && (
              <button className="btn btn--ghost notif-panel__mark" type="button" onClick={handleMarkAllRead}>
                Mark all read
              </button>
            )}
          </div>

          <div className="notif-panel__list">
            {loading && notifications.length === 0 && (
              <div className="notif-empty">Loading…</div>
            )}
            {!loading && notifications.length === 0 && (
              <div className="notif-empty">No notifications yet</div>
            )}
            {notifications.map((n) => (
              <button
                key={n._id}
                className={`notif-item${n.read ? '' : ' notif-item--unread'}`}
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
            ))}
          </div>
        </div>
      )}
    </div>
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

          <div className="auth">
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
                  to={`/profile/${encodeURIComponent(user.displayName || user.email)}`}
                  className="muted small auth__user auth__user--link"
                >
                  {user.displayName || user.email}
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
