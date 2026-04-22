/**
 * Creates a Tier 2 (physical auth) test order in auth_review status.
 * Simulates: buyer purchased → seller shipped Label A → arrived at auth center.
 *
 * Usage:
 *   node scripts/setup-tier2-test.js
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

const BUYER_EMAIL  = 'powertrade10k@gmail.com'
const SELLER_EMAIL = 'cryptofittrader@gmail.com'

async function main() {
  console.log('── Tier 2 test setup ──────────────────────────────────────')

  // 1. Look up buyer + seller
  const { data: users, error: usersErr } = await supabase
    .from('users')
    .select('id, email, full_name, street1, city, state, zip')
    .in('email', [BUYER_EMAIL, SELLER_EMAIL])

  if (usersErr) throw new Error('Could not fetch users: ' + usersErr.message)
  if (!users?.length) throw new Error('No test users found — check BUYER_EMAIL / SELLER_EMAIL')

  const buyer  = users.find(u => u.email === BUYER_EMAIL)
  const seller = users.find(u => u.email === SELLER_EMAIL)

  if (!buyer)  throw new Error(`Buyer not found: ${BUYER_EMAIL}`)
  if (!seller) throw new Error(`Seller not found: ${SELLER_EMAIL}`)

  console.log(`Buyer:  ${buyer.full_name || buyer.email} (${buyer.id})`)
  console.log(`Seller: ${seller.full_name || seller.email} (${seller.id})`)

  // Warn if addresses missing — Label B will fail without them
  const buyerMissingAddr  = !buyer.street1 || !buyer.city || !buyer.state || !buyer.zip
  const sellerMissingAddr = !seller.street1 || !seller.city || !seller.state || !seller.zip
  if (buyerMissingAddr)  console.warn('⚠  Buyer address is incomplete — Label B will fail. Add it in /profile.')
  if (sellerMissingAddr) console.warn('⚠  Seller address is incomplete — add it in /profile if Label A is needed.')

  // 2. Create a Tier 2 listing
  const listingPrice = 450  // > $300 = physical auth
  const { data: listing, error: listErr } = await supabase
    .from('listings')
    .insert({
      seller_id:    seller.id,
      game:         'Pokémon',
      set:          'Base Set',
      card_name:    'Charizard',
      card_number:  '4/102',
      grade:        '9',
      grader:       'PSA',
      cert_number:  '12345678',
      condition:    'Mint',
      listing_type: 'graded',
      price:        listingPrice,
      auth_tier:    'physical',
      photos:       [],
      status:       'sold',
      expires_at:   new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select('id')
    .single()

  if (listErr) throw new Error('Could not create listing: ' + listErr.message)
  console.log(`\nListing created: ${listing.id}`)

  // 3. Create the order in auth_review status
  const authFee      = 25   // Tier 2 physical auth fee
  const shippingCost = 18   // approximate for two labels
  const escrowAmount = listingPrice + authFee + shippingCost

  const bondAmount = parseFloat((listingPrice * 0.04).toFixed(2)) // new seller = 4%

  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .insert({
      listing_id:    listing.id,
      buyer_id:      buyer.id,
      seller_id:     seller.id,
      auth_tier:     'physical',
      escrow_amount: escrowAmount,
      platform_fee:  parseFloat((listingPrice * 0.035).toFixed(2)),
      auth_fee:      authFee,
      bond_amount:   bondAmount,
      shipping_cost: shippingCost,
      declared_value: listingPrice,
      status:        'auth_review',
      shipped_at:    new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    })
    .select('id')
    .single()

  if (orderErr) throw new Error('Could not create order: ' + orderErr.message)
  console.log(`Order created:   ${order.id}`)
  console.log(`Status:          auth_review`)
  console.log(`Auth tier:       physical`)
  console.log(`Escrow amount:   $${escrowAmount}`)
  console.log('\n── Done ────────────────────────────────────────────────────')
  console.log('Open /authenticator and the card should appear in Physical Inspection Queue.')
  console.log('Order ID for reference:', order.id)
}

main().catch(err => { console.error(err.message); process.exit(1) })
