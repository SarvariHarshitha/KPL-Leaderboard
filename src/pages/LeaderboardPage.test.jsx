import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import LeaderboardPage from './LeaderboardPage.jsx'
import { useEffect, useRef } from 'react'
import { KplProvider } from '../lib/KplProvider.jsx'
import { useKpl } from '../lib/useKpl.js'

function Seed({ children }) {
  const { addPost, ratePost, state } = useKpl()
  const didSeed = useRef(false)

  useEffect(() => {
    if (didSeed.current) return
    didSeed.current = true

    addPost({ author: 'A', text: 'Legend is @Neo' })
  }, [addPost])

  useEffect(() => {
    const postId = state.posts[0]?.id
    if (!postId) return
    ratePost({ postId, rater: 'X', rating: 5 })
  }, [ratePost, state.posts])

  return <>{children}</>
}

describe('LeaderboardPage', () => {
  it('shows player in leaderboard', async () => {
    localStorage.clear()

    render(
      <MemoryRouter>
        <KplProvider>
          <Seed>
            <LeaderboardPage />
          </Seed>
        </KplProvider>
      </MemoryRouter>,
    )

    expect(await screen.findByText('Neo')).toBeInTheDocument()
  })
})
