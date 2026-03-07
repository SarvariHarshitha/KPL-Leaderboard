import { describe, expect, it } from 'vitest'
import {
  addPost,
  buildLeaderboard,
  createInitialState,
  deleteComment,
  deletePost,
  addComment,
  ratePost,
} from './kplStore'

describe('kplStore', () => {
  it('adds average rating to all mentioned players', () => {
    let state = createInitialState()

    state = addPost(state, {
      author: 'Harshi',
      text: 'Lol @Asha and @Vikram did it again',
    })

    const postId = state.posts[0].id

    state = ratePost(state, { postId, rater: 'R1', rating: 5 })
    state = ratePost(state, { postId, rater: 'R2', rating: 3 })

    const board = buildLeaderboard(state)

    const asha = board.find((x) => x.name.toLowerCase() === 'asha')
    const vikram = board.find((x) => x.name.toLowerCase() === 'vikram')

    expect(asha.score).toBe(4)
    expect(vikram.score).toBe(4)
  })

  it('can remove a rating with 0', () => {
    let state = createInitialState()
    state = addPost(state, { author: 'A', text: 'Nice @P1' })
    const postId = state.posts[0].id

    state = ratePost(state, { postId, rater: 'R1', rating: 5 })
    state = ratePost(state, { postId, rater: 'R1', rating: 0 })

    expect((state.posts[0].ratings ?? []).length).toBe(0)
  })

  it('can delete comment and post', () => {
    let state = createInitialState()
    state = addPost(state, { author: 'A', text: 'Hello @P1' })
    const postId = state.posts[0].id

    state = addComment(state, { postId, author: 'C1', text: 'hi' })
    const commentId = state.posts[0].comments[0].id

    state = deleteComment(state, { postId, commentId })
    expect(state.posts[0].comments.length).toBe(0)

    state = deletePost(state, { postId })
    expect(state.posts.length).toBe(0)
  })
})
