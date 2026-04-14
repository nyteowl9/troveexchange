// Server component — force-dynamic bypasses static generation so this page
// is always server-rendered on demand instead of prebuilt at deploy time.
export const dynamic = 'force-dynamic'

import SignInClient from './SignInClient'

export default function Page() {
  return <SignInClient />
}
