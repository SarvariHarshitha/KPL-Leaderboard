import { useEffect, useRef, useState } from 'react'
import { fetchUsers } from '../lib/api.js'

/**
 * A textarea that shows a dropdown of registered users when the user types '@'.
 * Only registered users from the DB can be mentioned.
 */
export default function MentionTextarea({ value, onChange, placeholder, rows = 4, disabled }) {
  const [allUsers, setAllUsers] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [filter, setFilter] = useState('')
  const [cursorIdx, setCursorIdx] = useState(0)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const textareaRef = useRef(null)
  const dropdownRef = useRef(null)

  // Fetch users once on mount
  useEffect(() => {
    fetchUsers()
      .then(setAllUsers)
      .catch((err) => console.error('Failed to fetch users:', err))
  }, [])

  // Build the mention-friendly name (first name or displayName with spaces replaced)
  function mentionName(user) {
    const name = (user.displayName || user.email || '').trim()
    // Use the first name (word) so mentions stay clean: @Asha not @Asha_Kumar
    const first = name.split(/\s+/)[0]
    return first || name
  }

  // Filtered user list based on what's typed after @
  const filtered = allUsers.filter((u) => {
    const name = mentionName(u).toLowerCase()
    const email = (u.email || '').toLowerCase()
    const q = filter.toLowerCase()
    return name.includes(q) || email.includes(q)
  })

  function getAtContext(text, cursor) {
    // Walk backwards from cursor to find the nearest '@'
    const before = text.slice(0, cursor)
    const atIdx = before.lastIndexOf('@')
    if (atIdx === -1) return null
    // Make sure there's no space between @ and cursor (i.e. still typing the mention)
    const fragment = before.slice(atIdx + 1)
    if (/\s/.test(fragment)) return null
    return { atIdx, fragment }
  }

  function handleChange(e) {
    const newValue = e.target.value
    const cursor = e.target.selectionStart
    onChange(newValue)
    setCursorIdx(cursor)

    const ctx = getAtContext(newValue, cursor)
    if (ctx) {
      setFilter(ctx.fragment)
      setShowDropdown(true)
      setSelectedIdx(0)
    } else {
      setShowDropdown(false)
    }
  }

  function insertMention(user) {
    const ta = textareaRef.current
    const text = value
    const ctx = getAtContext(text, cursorIdx)
    if (!ctx) return

    const name = mentionName(user)
    const before = text.slice(0, ctx.atIdx)
    const after = text.slice(cursorIdx)
    const newText = `${before}@${name} ${after}`

    onChange(newText)
    setShowDropdown(false)

    // Restore focus and cursor position
    requestAnimationFrame(() => {
      if (ta) {
        const pos = ctx.atIdx + name.length + 2 // @ + name + space
        ta.focus()
        ta.setSelectionRange(pos, pos)
        setCursorIdx(pos)
      }
    })
  }

  function handleKeyDown(e) {
    if (!showDropdown || filtered.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIdx((i) => (i + 1) % filtered.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIdx((i) => (i - 1 + filtered.length) % filtered.length)
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      insertMention(filtered[selectedIdx])
    } else if (e.key === 'Escape') {
      setShowDropdown(false)
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        textareaRef.current &&
        !textareaRef.current.contains(e.target)
      ) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div className="mention-wrap">
      <textarea
        ref={textareaRef}
        className="textarea"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        rows={rows}
        disabled={disabled}
      />
      {showDropdown && filtered.length > 0 && (
        <ul className="mention-dropdown" ref={dropdownRef}>
          {filtered.map((u, idx) => (
            <li
              key={u._id}
              className={`mention-dropdown__item${idx === selectedIdx ? ' is-selected' : ''}`}
              onMouseDown={(e) => {
                e.preventDefault()
                insertMention(u)
              }}
              onMouseEnter={() => setSelectedIdx(idx)}
            >
              <span className="mention-dropdown__name">{u.displayName || u.email}</span>
              {u.displayName && u.email && (
                <span className="mention-dropdown__email">{u.email}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
