import { SETS_BY_GAME } from '@/lib/sets'

// Excluded Scryfall set types — not tradeable physical cards
const SCRYFALL_EXCLUDE = new Set([
  'token', 'memorabilia', 'minigame', 'alchemy', 'treasure_chest',
])

// GET /api/sets?game=magic  →  { sets: string[] }
// GET /api/sets?game=pokemon → { sets: string[] }
// Other games fall back to the static list in lib/sets.js
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const game = searchParams.get('game')

  try {
    if (game === 'magic') {
      const res = await fetch('https://api.scryfall.com/sets', {
        headers: { 'User-Agent': 'ChaseholIow/1.0 (chasehollow.com)' },
        next: { revalidate: 86400 }, // cache 24h at the Next.js fetch level
      })
      if (!res.ok) throw new Error(`Scryfall ${res.status}`)
      const json = await res.json()
      const sets = json.data
        .filter(s => !SCRYFALL_EXCLUDE.has(s.set_type))
        .sort((a, b) => (b.released_at || '0').localeCompare(a.released_at || '0'))
        .map(s => s.name)
      return Response.json({ sets })
    }

    if (game === 'pokemon') {
      const headers = {}
      if (process.env.POKEMON_TCG_API_KEY) headers['X-Api-Key'] = process.env.POKEMON_TCG_API_KEY
      const res = await fetch(
        'https://api.pokemontcg.io/v2/sets?pageSize=250&orderBy=-releaseDate',
        { headers, next: { revalidate: 86400 } }
      )
      if (!res.ok) throw new Error(`PokémonTCG ${res.status}`)
      const json = await res.json()
      const sets = json.data.map(s => s.name)
      return Response.json({ sets })
    }

    // Static fallback for One Piece, Yu-Gi-Oh!, etc.
    const staticMap = {
      onepiece: 'One Piece TCG',
      yugioh:   'Yu-Gi-Oh!',
      sports:   'Sports Cards',
    }
    return Response.json({ sets: SETS_BY_GAME[staticMap[game] || game] || [] })

  } catch (err) {
    console.error('[/api/sets]', err.message)
    // Return static fallback so the UI still works
    const fallbackMap = {
      magic:    'Magic: The Gathering',
      pokemon:  'Pokémon TCG',
      onepiece: 'One Piece TCG',
    }
    return Response.json({ sets: SETS_BY_GAME[fallbackMap[game] || game] || [] })
  }
}
