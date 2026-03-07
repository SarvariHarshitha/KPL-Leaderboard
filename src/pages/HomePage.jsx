import { useAuth } from '../lib/useAuth.js'

export default function HomePage({ onSignIn }) {
  const { user } = useAuth()

  return (
    <div className="stack">
      <section className="hero3d">
        <div className="hero3d__content">
          <h1 className="h1">Katwana Premier League (KPL)</h1>
          <p className="muted">
            A fun friends leaderboard: post the weird/funny thing someone did, comment, and rate the post. Each post’s{' '}
            <b>average rating</b> adds to the total score of the <b>@mentioned</b> people.
          </p>

          <div className="row" style={{ marginTop: 12, flexWrap: 'wrap' }}>
            <span className="pill">@mentions → points</span>
            <span className="pill">1–5 ratings</span>
            <span className="pill">Top players leaderboard</span>
          </div>

          {user ? (
            <div className="card" style={{ marginTop: 16 }}>
              You’re signed in as <b>{user.displayName || user.email}</b>. Use the navigation to open Posts or Leaderboard.
            </div>
          ) : (
            <div className="row" style={{ marginTop: 16 }}>
              <button className="btn" type="button" onClick={onSignIn}>
                Sign in with Google
              </button>
              <span className="muted small">Posts, comments, and leaderboard unlock after sign-in.</span>
            </div>
          )}
        </div>

        <div className="hero3d__scene" aria-hidden="true">
          <div className="cube">
            <div className="cube__face cube__front" />
            <div className="cube__face cube__back" />
            <div className="cube__face cube__right" />
            <div className="cube__face cube__left" />
            <div className="cube__face cube__top" />
            <div className="cube__face cube__bottom" />
          </div>
          <div className="ring" />
        </div>
      </section>

      <section className="card">
        <h2 className="h2">How it works</h2>
        <ol className="list">
          <li>Create a post and mention friends like <code>@Asha</code> or <code>@Vikram</code>.</li>
          <li>Other signed-in users rate the post (1–5). You can edit or remove your rating.</li>
          <li>We compute the post’s average rating and add it to every mentioned player’s total.</li>
          <li>The Leaderboard ranks players by total score.</li>
        </ol>

        <p className="muted small" style={{ marginTop: 12 }}>
          House rule idea: whoever tops the leaderboard at the end gives the party.
        </p>
      </section>
    </div>
  )
}
