'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/context/AuthContext'

// /profile → redirect to /profile/[username] for the logged-in user
export default function ProfileRedirect() {
  const { profile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (profile?.username) {
      router.replace(`/profile/${profile.username}`)
    } else {
      router.replace('/sign-in')
    }
  }, [profile, loading, router])

  return null
}
