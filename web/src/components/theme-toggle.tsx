'use client'

export function ThemeToggle() {
  function toggle() {
    const root = document.documentElement
    const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches
    root.dataset.theme = dark ? 'light' : 'dark'
    try { localStorage.setItem('theme', root.dataset.theme) } catch { /* penyimpanan tidak tersedia */ }
    window.dispatchEvent(new Event('themechange'))
  }
  return (
    <button type="button" onClick={toggle} aria-label="Ganti tema terang/gelap"
      className="rounded-md border border-line px-2 py-1 text-xs text-ink-2 hover:border-ink-3 hover:text-ink">
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
      </svg>
    </button>
  )
}
