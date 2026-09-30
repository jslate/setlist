import './style.css'

const THEME_KEY = 'chart-theme'
const MIN_SPEED = 1
const MAX_SPEED = 40
const DEFAULT_SPEED = 12

const root = document.querySelector('.song-page') || document.body
const slug = document.body.dataset.slug || 'default'
const SPEED_KEY = `chart-scroll-speed:${slug}`

// --- Theme ---

function currentTheme() {
  return root.dataset.theme === 'dark' ? 'dark' : 'light'
}

function applyTheme(theme) {
  root.dataset.theme = theme === 'dark' ? 'dark' : 'light'
}

function initialTheme() {
  const stored = localStorage.getItem(THEME_KEY)
  if (stored === 'dark' || stored === 'light') return stored
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

applyTheme(initialTheme())

// --- Speed ---

const songSpeedAttr = Number(document.body.dataset.scrollSpeed)
const storedSpeed = Number(localStorage.getItem(SPEED_KEY))
const initialSpeed = clamp(
  Number.isFinite(songSpeedAttr) && songSpeedAttr > 0
    ? songSpeedAttr
    : Number.isFinite(storedSpeed) && storedSpeed > 0
      ? storedSpeed
      : DEFAULT_SPEED
)

function clamp(v) {
  return Math.min(MAX_SPEED, Math.max(MIN_SPEED, v))
}

// --- Control bar ---

const bar = document.createElement('div')
bar.className = 'autoscroll-bar'

const playBtn = document.createElement('button')
playBtn.type = 'button'
playBtn.setAttribute('aria-label', 'Play autoscroll')
playBtn.textContent = '▶'

const slider = document.createElement('input')
slider.type = 'range'
slider.min = String(MIN_SPEED)
slider.max = String(MAX_SPEED)
slider.step = '1'
slider.value = String(initialSpeed)
slider.setAttribute('aria-label', 'Scroll speed')

const speedLabel = document.createElement('span')
speedLabel.className = 'speed-label'
speedLabel.textContent = `${initialSpeed} px/s`

const themeBtn = document.createElement('button')
themeBtn.type = 'button'
themeBtn.setAttribute('aria-label', 'Toggle dark mode')
themeBtn.textContent = currentTheme() === 'dark' ? '☀️' : '🌙'

bar.append(playBtn, slider, speedLabel, themeBtn)
document.body.appendChild(bar)

// --- Autoscroll engine ---

let speed = initialSpeed
let playing = false
let wakeLock = null
let lastTs = 0
let accum = 0
let userScrollTs = 0

const songEl = document.querySelector('.song')
if (songEl) songEl.style.willChange = 'transform'

function applySubpixel(offset) {
  if (!songEl) return
  songEl.style.transform = offset ? `translate3d(0, -${offset}px, 0)` : ''
}

function startWakeLock() {
  if (!('wakeLock' in navigator)) return
  navigator.wakeLock.request('screen').then(
    lock => {
      wakeLock = lock
      lock.addEventListener('release', () => {
        wakeLock = null
      })
    },
    () => {}
  )
}

function releaseWakeLock() {
  wakeLock?.release().catch(() => {})
  wakeLock = null
}

function setPlaying(next) {
  if (next === playing) return
  playing = next
  playBtn.textContent = playing ? '❚❚' : '▶'
  playBtn.setAttribute('aria-label', playing ? 'Pause autoscroll' : 'Play autoscroll')
  if (playing) {
    lastTs = 0
    accum = 0
    startWakeLock()
    requestAnimationFrame(tick)
  } else {
    applySubpixel(0)
    releaseWakeLock()
  }
}

function tick(ts) {
  if (!playing) return
  if (!lastTs) lastTs = ts
  const dt = (ts - lastTs) / 1000
  lastTs = ts
  accum += dt * speed
  if (accum >= 1) {
    const px = Math.floor(accum)
    accum -= px
    userScrollTs = performance.now() // suppress upcoming scroll event's pause
    window.scrollBy(0, px)
    const atBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 1
    if (atBottom) {
      applySubpixel(0)
      setPlaying(false)
      return
    }
  }
  applySubpixel(accum)
  requestAnimationFrame(tick)
}

// If the user manually scrolls (not our programmatic scroll), pause.
window.addEventListener('scroll', () => {
  if (!playing) return
  if (performance.now() - userScrollTs < 50) return
  setPlaying(false)
}, { passive: true })

// Re-acquire wake lock if the tab becomes visible again while playing.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && playing && !wakeLock) {
    startWakeLock()
  }
})

// --- Wire up controls ---

playBtn.addEventListener('click', () => setPlaying(!playing))

slider.addEventListener('input', () => {
  speed = clamp(Number(slider.value))
  speedLabel.textContent = `${speed} px/s`
  localStorage.setItem(SPEED_KEY, String(speed))
})

themeBtn.addEventListener('click', () => {
  const next = currentTheme() === 'dark' ? 'light' : 'dark'
  applyTheme(next)
  localStorage.setItem(THEME_KEY, next)
  themeBtn.textContent = next === 'dark' ? '☀️' : '🌙'
})
