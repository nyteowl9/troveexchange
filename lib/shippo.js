import { Shippo } from 'shippo'

export const shippo = new Shippo({ apiKeyHeader: process.env.SHIPPO_API_KEY })

// Chase Hollow auth center address (Tier 2 physical auth)
export const AUTH_CENTER_ADDRESS = {
  name: 'Chase Hollow Authentication',
  street1: '919 S 25th East',  // UPDATE before launch
  city: 'Idaho Falls',
  state: 'ID',
  zip: '83401',
  country: 'US',
  phone: '2082015911',
}

// Signature confirmation thresholds by declared value
function signatureLevel(declaredValue) {
  if (declaredValue >= 3000) return 'ADULT'
  if (declaredValue >= 800)  return 'DIRECT'
  if (declaredValue >= 300)  return 'INDIRECT'
  return null
}

/**
 * Server-side helper — creates a Shippo label and returns { labelUrl, trackingNumber }.
 * Picks cheapest carrier rate. Throws on failure.
 */
export async function createShippoLabel(addressFrom, addressTo, declaredValue = 0) {
  const sig = signatureLevel(declaredValue)
  const extra = {
    ...(declaredValue > 0 ? { insurance: { amount: declaredValue.toFixed(2), currency: 'USD', content: 'Trading Card' } } : {}),
    ...(sig ? { signatureConfirmation: sig } : {}),
  }

  const shipment = await shippo.shipments.create({
    addressFrom: { ...addressFrom, validate: false },
    addressTo:   { ...addressTo,   validate: false },
    parcels: [{
      length: '6', width: '4', height: '1',
      distanceUnit: 'in', weight: '0.5', massUnit: 'lb',
    }],
    extra: Object.keys(extra).length ? extra : undefined,
    async: false,
  })

  const bestRate = shipment.rates.sort((a, b) => parseFloat(a.amount) - parseFloat(b.amount))[0]
  if (!bestRate) throw new Error('No shipping rates available for this address pair')

  const transaction = await shippo.transactions.create({
    rate: bestRate.objectId, labelFileType: 'PDF', async: false,
  })

  if (transaction.status !== 'SUCCESS') {
    const detail = (transaction.messages || []).map(m => m.text || JSON.stringify(m)).join('; ') || 'Unknown Shippo error'
    throw new Error(`Label purchase failed: ${detail}`)
  }

  return { labelUrl: transaction.labelUrl, trackingNumber: transaction.trackingNumber }
}
