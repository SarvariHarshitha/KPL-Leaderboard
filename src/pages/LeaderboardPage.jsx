import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchLeaderboard } from '../lib/api.js'

const MEDALS = ['🥇', '🥈', '🥉']

export default function LeaderboardPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLeaderboard()
      .then(setRows)
      .catch((err) => console.error('Leaderboard fetch failed:', err))
      .finally(() => setLoading(false))
  }, [])

  const top3 = rows.slice(0, 3)
  const rest = rows.slice(3)

  // Podium order: 2nd, 1st, 3rd (visually center is tallest)
  const podiumOrder = top3.length >= 3
    ? [top3[1], top3[0], top3[2]]
    : top3.length === 2
      ? [top3[1], top3[0]]
      : top3

  const podiumRanks = top3.length >= 3
    ? [1, 0, 2]
    : top3.length === 2
      ? [1, 0]
      : [0]

  return (
    <div className="stack">
      <section className="hero">
        <div>
          <h1 className="h1">KPL Leaderboard</h1>
          <p className="muted">Only people (from @mentions) appear here. Posts are not shown on this page.</p>
        </div>
      </section>

      {loading ? (
        <section className="card">
          <div className="muted">Loading leaderboard…</div>
        </section>
      ) : rows.length === 0 ? (
        <section className="card">
          <div className="empty">No scores yet. Add posts with @mentions and rate them.</div>
        </section>
      ) : (
        <>
          {/* Podium */}
          <section className="podium-wrapper">
            <div className="podium">
              {podiumOrder.map((player, i) => {
                const rank = podiumRanks[i]
                return (
                  <div
                    key={player.name}
                    className={`podium__slot podium__slot--${rank + 1}`}
                  >
                    <div className="podium__medal">{MEDALS[rank]}</div>
                    <Link to={`/profile/${encodeURIComponent(player.name)}`} className="podium__name podium__name--link">{player.name}</Link>
                    <div className="podium__score">{Math.round(player.score * 100) / 100} pts</div>
                    <div className="podium__mentions">{player.postsMentionedIn} mention{player.postsMentionedIn !== 1 ? 's' : ''}</div>
                    <div className={`podium__block podium__block--${rank + 1}`}>
                      <span className="podium__rank">{rank + 1}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Remaining players */}
          {rest.length > 0 && (
            <section className="card">
              <div className="table">
                <div className="table__row table__head">
                  <div>#</div>
                  <div>Person</div>
                  <div className="right">Score</div>
                  <div className="right">Mentions</div>
                </div>

                {rest.map((r, idx) => (
                  <div key={r.name.toLowerCase()} className="table__row">
                    <div className="muted">{idx + 4}</div>
                    <div><Link to={`/profile/${encodeURIComponent(r.name)}`} className="table__link">{r.name}</Link></div>
                    <div className="right">{Math.round(r.score * 100) / 100}</div>
                    <div className="right muted">{r.postsMentionedIn}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Party rule */}
          {rows.length > 0 && (
            <section className="card party-banner">
              <span className="party-banner__emoji">🎉</span>
              <div>
                <Link to={`/profile/${encodeURIComponent(rows[0].name)}`} style={{ fontWeight: 700, textDecoration: 'none', color: 'inherit' }}>{rows[0].name}</Link> is leading with {Math.round(rows[0].score * 100) / 100} pts — they give the party!
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
