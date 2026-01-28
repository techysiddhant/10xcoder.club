'use client'

import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import { Field, FieldError, FieldGroup, FieldLabel } from '@workspace/ui/components/field'
import { Loader2, Mail, CheckCircle2, ArrowLeft } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import toast from 'react-hot-toast'
import { publicEnv } from '@/env/public'
import { useQueryState } from 'nuqs'
import { sanitizeRedirectUrl } from '@/lib/utils'

// Zod schema for magic link validation
const magicLinkSchema = z.object({
  email: z.string().min(1, 'Email is required.').email('Please enter a valid email address.')
})

export const MagicLinkForm = () => {
  const [isSent, setIsSent] = useState(false)
  const [sentEmail, setSentEmail] = useState('')
  const [redirectUrl] = useQueryState('redirectUrl', {
    defaultValue: '/'
  })

  const safeRedirectUrl = sanitizeRedirectUrl(redirectUrl)

  const form = useForm({
    defaultValues: {
      email: ''
    },
    validators: {
      onChange: magicLinkSchema
    },
    onSubmit: async ({ value }) => {
      await authClient.signIn.magicLink(
        {
          email: value.email,
          callbackURL: `${publicEnv.NEXT_PUBLIC_APP_URL}${safeRedirectUrl}`
        },
        {
          onSuccess: () => {
            setSentEmail(value.email)
            setIsSent(true)
            toast.success('Magic link sent')
          },
          onError: (error) => {
            toast.error(error?.error?.message || 'Something went wrong')
          }
        }
      )
    }
  })

  const handleReset = () => {
    setIsSent(false)
    setSentEmail('')
    form.reset()
  }

  if (isSent) {
    return (
      <div className="space-y-6 text-center py-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8 text-primary" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-foreground">Check your email</h3>
          <p className="text-muted-foreground text-sm">
            We've sent a magic link to
            <br />
            <span className="font-medium text-foreground">{sentEmail}</span>
          </p>
        </div>
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Click the link in the email to sign in instantly.
            <br />
            The link will expire in 10 minutes.
          </p>
          <Button
            variant="ghost"
            onClick={handleReset}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Use a different email
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
    >
      <FieldGroup>
        {/* Email Field */}
        <form.Field name="email">
          {(field) => {
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
        </form.Field>

        <Button
          type="submit"
          className="w-full h-12 text-base font-medium"
          disabled={form.state.isSubmitting}
        >
          {form.state.isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Sending link...
            </>
          ) : (
            <>
              <Mail className="w-4 h-4" />
              Send magic link
            </>
          )}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          We'll send you a magic link for a password-free sign in
        </p>
      </FieldGroup>
    </form>
  )
}
