'use client'

import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel
} from '@workspace/ui/components/field'
import { Github, Loader2, Check } from 'lucide-react'
import { useQueryState } from 'nuqs'
import { authClient } from '@/lib/auth-client'
import toast from 'react-hot-toast'
import { publicEnv } from '@/env/public'
import { sanitizeRedirectUrl } from '@/lib/utils'

interface SignUpFormProps {
  onSwitchMode: () => void
}

// Zod schema for form validation
const signUpSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters.')
    .max(50, 'Name must be at most 50 characters.'),
  email: z.string().min(1, 'Email is required.').email('Please enter a valid email address.'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter.')
    .regex(/\d/, 'Password must contain at least one number.')
})

export const SignUpForm = ({ onSwitchMode }: SignUpFormProps) => {
  const [redirectUrl] = useQueryState('redirectUrl', {
    defaultValue: '/'
  })

  const safeRedirectUrl = sanitizeRedirectUrl(redirectUrl)

  const form = useForm({
    defaultValues: {
      name: '',
      email: '',
      password: ''
    },
    validators: {
      onChange: signUpSchema
    },
    onSubmit: async ({ value }) => {
      try {
        await authClient.signUp.email(
          {
            name: value.name,
            email: value.email,
            password: value.password,
            callbackURL: safeRedirectUrl
          },
          {
            onSuccess: () => {
              toast.success('Sign up successful! Please check your email.')
            },
            onError: (error) => {
              toast.error(error?.error?.message || 'Something went wrong')
            }
          }
        )
      } catch (error) {
        console.error('Sign up error:', error)
        toast.error(error instanceof Error ? error.message : 'Network error')
      }
    }
  })

  const handleGithubSignUp = async () => {
    try {
      await authClient.signIn.social(
        {
          provider: 'github',
          callbackURL: `${publicEnv.NEXT_PUBLIC_APP_URL}${safeRedirectUrl}`
        },
        {
          onSuccess: () => {
            toast.success('Sign up successful')
          },
          onError: (error) => {
            toast.error(error?.error?.message || 'Something went wrong')
          }
        }
      )
    } catch (error) {
      console.error('GitHub sign up error:', error)
      toast.error(error instanceof Error ? error.message : 'Something went wrong')
    }
  }

  // Password requirements helper function
  const getPasswordRequirements = (password: string) => [
    {
      label: 'At least 8 characters',
      met: password.length >= 8
    },
    {
      label: 'Contains a number',
      met: /\d/.test(password)
    },
    {
      label: 'Contains uppercase letter',
      met: /[A-Z]/.test(password)
    }
  ]

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-3xl font-bold text-foreground">Create account</h2>
        <p className="text-muted-foreground">
          Join thousands of developers using 10xcoder
          <span className="size-1 rounded-full bg-primary inline-block mx-0.5"></span>
          club
        </p>
      </div>

      {/* Social Sign Up */}
      <Button
        variant="outline"
        className="w-full h-12 text-base font-medium gap-3 border-border hover:bg-accent"
        onClick={handleGithubSignUp}
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
          <span className="bg-background px-2 text-muted-foreground">Or sign up with email</span>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
      >
        <FieldGroup>
          {/* Name Field */}
          <form.Field
            name="name"
            children={(field) => {
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Full name</FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
                    placeholder="John Doe"
                    autoComplete="name"
                    className="h-12 bg-background border-border"
                  />
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              )
            }}
          />

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
              const password = field.state.value
              const showRequirements = password.length > 0
              const requirements = getPasswordRequirements(password)

              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Password</FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="password"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
                    placeholder="Create a strong password"
                    autoComplete="new-password"
                    className="h-12 bg-background border-border"
                  />
                  {showRequirements && (
                    <div className="space-y-1.5 pt-1">
                      {requirements.map((req, index) => (
                        <div
                          key={index}
                          className={`flex items-center gap-2 text-xs transition-colors ${
                            req.met ? 'text-primary' : 'text-muted-foreground'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-full flex items-center justify-center transition-colors ${
                              req.met ? 'bg-primary' : 'bg-muted'
                            }`}
                          >
                            {req.met && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                          </div>
                          {req.label}
                        </div>
                      ))}
                    </div>
                  )}
                  {isInvalid && !showRequirements && (
                    <FieldError errors={field.state.meta.errors} />
                  )}
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
                Creating account...
              </>
            ) : (
              'Create account'
            )}
          </Button>
        </FieldGroup>
      </form>

      <p className="text-center text-xs text-muted-foreground">
        By signing up, you agree to our{' '}
        <button type="button" className="text-primary hover:text-primary/80 transition-colors">
          Terms of Service
        </button>{' '}
        and{' '}
        <button type="button" className="text-primary hover:text-primary/80 transition-colors">
          Privacy Policy
        </button>
      </p>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <button
          type="button"
          onClick={onSwitchMode}
          className="text-primary hover:text-primary/80 font-medium transition-colors"
        >
          Sign in
        </button>
      </p>
    </div>
  )
}
