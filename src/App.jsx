import './App.css'
import { Link, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import LeaderboardPage from './pages/LeaderboardPage.jsx'
import PostsPage from './pages/PostsPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import { useAuth } from './lib/useAuth.js'
import HomePage from './pages/HomePage.jsx'

function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <div className="container"><div className="card">Loading…</div></div>
  if (!user) return <Navigate to="/" replace state={{ from: location }} />
  return children
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
