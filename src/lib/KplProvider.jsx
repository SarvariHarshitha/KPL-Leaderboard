import { useCallback, useEffect, useMemo, useState } from 'react'
import * as api from './api.js'
import { KplContext } from './kplContext.js'

export function KplProvider({ children }) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  // Fetch all posts on mount
  const refresh = useCallback(async () => {
    try {
      const data = await api.fetchPosts()
      setPosts(data)
    } catch (err) {
      console.error('Failed to fetch posts:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const actions = useMemo(() => ({
    addPost: async (payload) => {
      await api.createPost(payload)
      await refresh()
    },
    addComment: async ({ postId, authorId, authorName, authorPhotoURL, text }) => {
      await api.createComment(postId, { authorId, authorName, authorPhotoURL, text })
      await refresh()
    },
    addReply: async ({ postId, commentId, authorId, authorName, authorPhotoURL, text }) => {
      await api.createReply(postId, commentId, { authorId, authorName, authorPhotoURL, text })
      await refresh()
    },
    deletePost: async ({ postId, userId }) => {
      await api.removePost(postId, userId)
      await refresh()
    },
    deleteComment: async ({ postId, commentId, userId }) => {
      await api.removeComment(postId, commentId, userId)
      await refresh()
    },
    ratePost: async ({ postId, raterId, raterName, rating }) => {
      await api.ratePost(postId, { raterId, raterName, rating })
      await refresh()
    },
    toggleLike: async ({ postId, userId }) => {
      await api.toggleLike(postId, { userId })
      await refresh()
    },
    refresh,
  }), [refresh])

  // Build a state object that matches what the pages expect
  const state = useMemo(() => ({ posts }), [posts])

  const value = useMemo(
    () => ({ state, loading, ...actions }),
    [state, loading, actions],
  )

  return <KplContext.Provider value={value}>{children}</KplContext.Provider>
}
