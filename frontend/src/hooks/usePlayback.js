import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * Drives an animated playback cursor over an array of positions.
 * Returns the current position index and playback controls.
 *
 * `speed` is a multiplier: 1 = real-time, 5 = 5× faster, etc.
 * The animation steps are time-proportional (uses device_time deltas).
 */
export function usePlayback(positions) {
  const [index,   setIndex]   = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed,   setSpeed]   = useState(5) // default 5× so short trips are watchable
  const rafRef    = useRef(null)
  const lastRef   = useRef(null)   // timestamp of last RAF frame
  const accumRef  = useRef(0)      // accumulated ms since last step

  const total = positions.length

  const stop = useCallback(() => {
    setPlaying(false)
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    lastRef.current  = null
    accumRef.current = 0
  }, [])

  const play = useCallback(() => {
    if (total < 2) return
    setPlaying(true)
  }, [total])

  const reset = useCallback(() => {
    stop()
    setIndex(0)
  }, [stop])

  const seek = useCallback((idx) => {
    setIndex(Math.max(0, Math.min(idx, total - 1)))
  }, [total])

  // RAF loop — advances index based on device_time delta between positions
  useEffect(() => {
    if (!playing || total < 2) return

    const tick = (now) => {
      if (lastRef.current === null) {
        lastRef.current = now
      }

      const wallDelta = now - lastRef.current
      lastRef.current  = now
      accumRef.current += wallDelta * speed

      setIndex((prev) => {
        if (prev >= total - 1) {
          stop()
          return prev
        }

        const curr = positions[prev]
        const next = positions[prev + 1]
        const gpsDelta = new Date(next.device_time) - new Date(curr.device_time) // ms

        if (accumRef.current >= gpsDelta) {
          accumRef.current -= gpsDelta
          return prev + 1
        }
        return prev
      })

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [playing, speed, positions, total, stop])

  return {
    index,
    playing,
    speed,
    total,
    currentPosition: positions[index] ?? null,
    play,
    stop,
    reset,
    seek,
    setSpeed,
  }
}
