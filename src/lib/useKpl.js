import { useContext } from 'react'
import { KplContext } from './kplContext.js'

export function useKpl() {
  const ctx = useContext(KplContext)
  if (!ctx) throw new Error('useKpl must be used within KplProvider')
  return ctx
}
