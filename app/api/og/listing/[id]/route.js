import { ImageResponse } from 'next/og'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(_request, { params }) {
  const { id } = await params

  const { data: listing } = await supabaseAdmin
    .from('listings')
    .select('card_name, game')
    .eq('id', id)
    .single()

  const cardName = listing?.card_name || 'Chase Hollow'

  return new ImageResponse(
    (
      <div
        style={{
          width: '1080px',
          height: '1080px',
          background: '#0A0A0B',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#C9A84C',
          fontSize: '48px',
        }}
      >
        {cardName}
      </div>
    ),
    { width: 1080, height: 1080 }
  )
}
