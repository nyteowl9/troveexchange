import { useState, useEffect } from 'react'
import { SETS_BY_GAME } from '@/lib/sets'

// Maps seller dashboard game names → API key used by /api/sets
export const GAME_TO_API_KEY = {
  'Magic: The Gathering': 'magic',
  'Pokémon TCG':          'pokemon',
}

// Maps marketplace category IDs → game display name
export const CATEGORY_TO_GAME = {
  pokemon:  'Pokémon TCG',
  mtg:      'Magic: The Gathering',
  onepiece: 'One Piece TCG',
}

// Module-level cache — survives re-renders and component unmounts within a session
const setsCache = {}
const inFlight  = {}

function fetchSetsForGame(game) {
  const apiKey = GAME_TO_API_KEY[game]
  if (!apiKey) return Promise.resolve(SETS_BY_GAME[game] || [])

  if (setsCache[apiKey]) return Promise.resolve(setsCache[apiKey])

  if (!inFlight[apiKey]) {
    inFlight[apiKey] = fetch(`/api/sets?game=${apiKey}`)
      .then(r => r.json())
      .then(({ sets }) => {
        if (sets?.length > 0) setsCache[apiKey] = sets
        return sets || SETS_BY_GAME[game] || []
      })
      .catch(() => SETS_BY_GAME[game] || [])
  }

  return inFlight[apiKey]
}

// Returns { sets, loading }
// Immediately provides the static list, then upgrades to the full API list.
export function useSets(game) {
  const [sets, setSets]       = useState(() => SETS_BY_GAME[game] || [])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!game) { setSets([]); return }

    // Show static list right away so the UI isn't blank
    setSets(SETS_BY_GAME[game] || [])

    const apiKey = GAME_TO_API_KEY[game]
    if (!apiKey) return // One Piece / others: static list is sufficient

    // If already cached, upgrade immediately (no loading flash)
    if (setsCache[apiKey]) {
      setSets(setsCache[apiKey])
      return
    }

    setLoading(true)
    fetchSetsForGame(game).then(result => {
      if (result?.length > 0) setSets(result)
      setLoading(false)
    })
  }, [game])

  return { sets, loading }
}
