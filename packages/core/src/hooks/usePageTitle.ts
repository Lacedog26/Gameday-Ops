import { useEffect } from 'react'

/**
 * Set the browser tab title for a route, restoring the previous title on unmount.
 * Keeps the product feeling finished ("GameDayOps College — Pricing", etc.).
 */
export function usePageTitle(title: string): void {
  useEffect(() => {
    const prev = document.title
    document.title = title
    return () => {
      document.title = prev
    }
  }, [title])
}
