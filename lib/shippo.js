import Shippo from 'shippo'

export const shippo = new Shippo({ apiKeyHeader: process.env.SHIPPO_API_KEY })

// Chase Hollow auth center address (Tier 2 physical auth)
export const AUTH_CENTER_ADDRESS = {
  name: 'Chase Hollow Authentication',
  street1: '123 Placeholder St',  // UPDATE before launch
  city: 'Austin',
  state: 'TX',
  zip: '78701',
  country: 'US',
  phone: '5555555555',
}
