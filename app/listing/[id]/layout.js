import { supabaseAdmin } from '@/lib/supabase-admin'

export async function generateMetadata({ params }) {
  const { id } = await params

  const { data: listing } = await supabaseAdmin
    .from('listings')
    .select('card_name, game, price, listing_type, grade, grader')
    .eq('id', id)
    .single()

  if (!listing) return { title: 'Chase Hollow' }

  const isGraded = listing.listing_type === 'graded' && listing.grader
  const label    = isGraded ? `${listing.card_name} ${listing.grader} ${listing.grade}` : listing.card_name
  const title    = `${label} — Chase Hollow`
  const desc     = `${listing.game} · $${parseFloat(listing.price).toLocaleString()} USDC · Authenticated TCG marketplace on Base`
  const ogImage  = `/api/og/listing/${id}`

  return {
    title,
    description: desc,
    openGraph: {
      title,
      description: desc,
      images: [{ url: ogImage, width: 1080, height: 1080, alt: listing.card_name }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: desc,
      images: [ogImage],
      site: '@chasehollowtcg',
    },
  }
}

export default function ListingLayout({ children }) {
  return children
}
