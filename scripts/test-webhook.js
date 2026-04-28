/**
 * Fire a simulated Shippo webhook event locally.
 * Usage:
 *   node scripts/test-webhook.js transit  9200190396055700831396
 *   node scripts/test-webhook.js delivered 9200190396055700831396
 */

const http = require('http')

const event  = process.argv[2] || 'transit'
const tracking = process.argv[3]
if (!tracking) { console.error('Usage: node scripts/test-webhook.js <transit|delivered> <tracking_number>'); process.exit(1) }

const status = event === 'delivered' ? 'DELIVERED' : 'TRANSIT'

const body = JSON.stringify({
  event: 'track_updated',
  data: {
    tracking_number: tracking,
    tracking_status: { status },
  },
})

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/webhooks/shippo',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  },
}

const req = http.request(options, res => {
  let data = ''
  res.on('data', chunk => data += chunk)
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`)
    console.log(`Response: ${data}`)
  })
})

req.on('error', err => console.error('Request failed:', err.message))
req.write(body)
req.end()
