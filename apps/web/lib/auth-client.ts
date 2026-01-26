import { publicEnv } from '@/env/public'
import { magicLinkClient, usernameClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'
export const authClient = createAuthClient({
  baseURL: publicEnv.NEXT_PUBLIC_API_URL,
  plugins: [magicLinkClient(), usernameClient()]
})
