'use client'

import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import { Field, FieldError, FieldGroup, FieldLabel } from '@workspace/ui/components/field'
import { Github, Loader2, Mail, Sparkles } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import toast from 'react-hot-toast'
import { useQueryState } from 'nuqs'
import { publicEnv } from '@/env/public'
import { sanitizeRedirectUrl } from '@/lib/utils'
import { MagicLinkForm } from './magic-link-form'

interface SignInFormProps {
  onSwitchMode: () => void
}

// Zod schema for sign in validation
const signInSchema = z.object({
  email: z.string().min(1, 'Email is required.').email('Please enter a valid email address.'),
  password: z.string().min(1, 'Password is required.')
})

const SignInForm = ({ onSwitchMode }: SignInFormProps) => {
  const [authMethod, setAuthMethod] = useState<'password' | 'magic-link'>('password')
  const [redirectUrl] = useQueryState('redirectUrl', {
    defaultValue: '/'
  })

  const safeRedirectUrl = sanitizeRedirectUrl(redirectUrl)

  const form = useForm({
    defaultValues: {
      email: '',
      password: ''
    },
    validators: {
      onChange: signInSchema
    },
    onSubmit: async ({ value }) => {
      try {
        await authClient.signIn.email(
          {
            email: value.email,
            password: value.password,
            callbackURL: safeRedirectUrl
          },
          {
            onSuccess: () => {
              toast.success('Sign in successful')
            },
            onError: (error) => {
              toast.error(error?.error?.message || 'Something went wrong')
            }
          }
        )
      } catch (error) {
        console.error('Email sign in error:', error)
        toast.error(error instanceof Error ? error.message : 'Something went wrong')
      }
    }
  })

  const handleGithubSignIn = async () => {
    try {
      await authClient.signIn.social(
        {
          provider: 'github',
          callbackURL: `${publicEnv.NEXT_PUBLIC_APP_URL}${safeRedirectUrl}`
        },
        {
          onSuccess: () => {
            toast.success('Sign in successful')
          },
          onError: (error) => {
            toast.error(error?.error?.message || 'Something went wrong')
          }
        }
      )
    } catch (error) {
      console.error('GitHub sign in error:', error)
      toast.error(error instanceof Error ? error.message : 'Something went wrong')
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-3xl font-bold text-foreground">Welcome back</h2>
        <p className="text-muted-foreground">Sign in to your account to continue</p>
      </div>

      {/* Social Sign In */}
      <Button
        variant="outline"
        className="w-full h-12 text-base font-medium gap-3 border-border hover:bg-accent"
        onClick={handleGithubSignIn}
        disabled={form.state.isSubmitting}
      >
        <Github className="w-5 h-5" />
        Continue with GitHub
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
        </div>
      </div>

      {/* Auth Method Toggle */}
      <div className="flex gap-2 p-1 bg-muted rounded-lg">
        <button
          type="button"
          onClick={() => setAuthMethod('password')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${
            authMethod === 'password'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Mail className="w-4 h-4" />
          Email & Password
        </button>
        <button
          type="button"
          onClick={() => setAuthMethod('magic-link')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${
            authMethod === 'magic-link'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Magic Link
        </button>
      </div>

      {authMethod === 'password' ? (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
        >
          <FieldGroup>
            {/* Email Field */}
            <form.Field
              name="email"
              children={(field) => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="email"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      placeholder="you@example.com"
                      autoComplete="email"
                      className="h-12 bg-background border-border"
                    />
                    {isInvalid && <FieldError errors={field.state.meta.errors} />}
                  </Field>
                )
              }}
            />

            {/* Password Field */}
            <form.Field
              name="password"
              children={(field) => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                return (
                  <Field data-invalid={isInvalid}>
                    <div className="flex items-center justify-between">
                      <FieldLabel htmlFor={field.name}>Password</FieldLabel>
                      <button
                        type="button"
                        className="text-sm text-primary hover:text-primary/80 transition-colors"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="password"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className="h-12 bg-background border-border"
                    />
                    {isInvalid && <FieldError errors={field.state.meta.errors} />}
                  </Field>
                )
              }}
            />

            <Button
              type="submit"
              className="w-full h-12 text-base font-medium"
              disabled={form.state.isSubmitting}
            >
              {form.state.isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </FieldGroup>
        </form>
      ) : (
        <MagicLinkForm />
      )}

      <p className="text-center text-sm text-muted-foreground">
        Don't have an account?{' '}
        <button
          type="button"
          onClick={onSwitchMode}
          className="text-primary hover:text-primary/80 font-medium transition-colors"
        >
          Sign up
        </button>
      </p>
    </div>
  )
}

export default SignInForm
