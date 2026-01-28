import Link from 'next/link'
import { Suspense } from 'react'
import { ArrowLeft } from 'lucide-react'
import ThemeToggle from '@/components/theme-toggle'
import AuthPage from './auth'
import Logo from '@/components/logo'
const Auth = () => {
  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-linear-to-br from-primary/10 via-background to-primary/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-dot-pattern opacity-50" />
        <div className="absolute top-6 left-6 z-20">
          <Link
            href="/"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back to home</span>
          </Link>
        </div>
        <div className="absolute top-6 right-6 z-20">
          <ThemeToggle />
        </div>
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Logo />
            </div>
            <h1 className="text-4xl xl:text-5xl font-bold text-foreground leading-tight">
              Your gateway to
              <br />
              <span className="text-gradient">curated resources</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-md">
              Access thousands of hand-picked developer tools, templates, and learning resources.
              Join our growing community.
            </p>
            <div className="flex items-center gap-8 pt-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-foreground">500+</div>
                <div className="text-sm text-muted-foreground">Resources</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-foreground">10k+</div>
                <div className="text-sm text-muted-foreground">Developers</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-foreground">4.9</div>
                <div className="text-sm text-muted-foreground">Rating</div>
              </div>
            </div>
          </div>
        </div>
        {/* Decorative elements */}
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-primary/10 rounded-full blur-2xl" />
      </div>

      {/* Right side - Auth forms */}
      <div className="w-full lg:w-1/2 flex flex-col">
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-border">
          <Link
            href="/"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </Link>
          <div className="flex items-center gap-3">
            <Logo />
          </div>
          <ThemeToggle />
        </div>

        <Suspense
          fallback={
            <div className="flex-1 flex items-center justify-center p-6 sm:p-8">
              <div className="w-full max-w-md space-y-6">
                <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
              </div>
            </div>
          }
        >
          <AuthPage />
        </Suspense>
      </div>
    </div>
  )
}

export default Auth
