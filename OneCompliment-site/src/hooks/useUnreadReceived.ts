import { useEffect, useSyncExternalStore } from 'react'
import {
  subscribeUnread,
  getUnreadSnapshot,
  refreshUnread,
} from '../lib/unreadReceived'

/**
 * Returns the live count of unseen received compliments. Refreshes on mount
 * and whenever the tab regains focus (web equivalent of mobile's
 * AppState→foreground refresh), so the BottomNav red dot reflects compliments
 * that arrived while the tab was backgrounded.
 */
export function useUnreadReceived(): number {
  const count = useSyncExternalStore(subscribeUnread, getUnreadSnapshot, getUnreadSnapshot)

  useEffect(() => {
    void refreshUnread()
    const onFocus = () => {
      if (document.visibilityState !== 'hidden') void refreshUnread()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [])

  return count
}
