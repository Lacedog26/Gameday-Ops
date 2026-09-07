import { useEffect } from 'react'

export type ShortcutMap = Record<string, (e: KeyboardEvent) => void>

/**
 * Registers single-key shortcuts. Keys are matched case-insensitively against
 * `e.key` (e.g. "f", "s", " ", "Escape"). Ignores keystrokes while typing in
 * inputs/textareas so the admin forms are unaffected.
 */
export function useKeyboardShortcuts(map: ShortcutMap): void {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target) {
        const tag = target.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable) {
          return
        }
      }
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key
      const fn = map[key]
      if (fn) {
        fn(e)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [map])
}
