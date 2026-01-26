'use client'
import { Button } from '@workspace/ui/components/button'
import Link from 'next/link'
import { BookOpen } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import UserProfileDropdown from './user-profile-dropdown'
import Logo from './logo'

const Header = () => {
  const { data: session, isPending } = authClient.useSession()
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Logo />
          {/* Right side - Navigation + Auth */}
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="hidden md:flex items-center gap-1">
              <Button variant="ghost" size="sm" className="gap-2 font-medium" asChild>
                <Link href="/resources">
                  <BookOpen className="w-4 h-4" />
                  Resources
                </Link>
              </Button>
            </div>
            <div className="hidden md:block h-5 w-px bg-border mx-2" />
            {isPending ? (
              <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
            ) : session ? (
              <UserProfileDropdown />
            ) : (
              <>
                <Button variant="ghost" size="sm" className="font-medium" asChild>
                  <Link href="/auth?mode=signin">Sign In</Link>
                </Button>
                <Button size="sm" className="font-medium" asChild>
                  <Link href="/auth?mode=signup">Get Started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Header
