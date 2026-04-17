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
