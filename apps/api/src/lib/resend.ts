import { env } from '@/config/env'
import MagicLinkEmail from '@/emails/magic-link'
import ResetPasswordEmail from '@/emails/reset-password'
import VerificationEmail from '@/emails/verification-email'
import { assertValidEmailUrl } from '@/utils/url-validator'
import { Resend } from 'resend'

const resend = new Resend(env.RESEND_API_KEY)

const sendResetPasswordEmail = async (email: string, name: string, url: string) => {
  // Validate URL before sending to prevent phishing attacks
  const sanitizedUrl = assertValidEmailUrl(url)

  await resend.emails.send({
    from: `10xCoder.club <no-reply@${env.DOMAIN}>`,
    to: email,
    subject: 'Reset your password',
    react: ResetPasswordEmail({ name, url: sanitizedUrl })
  })

  return true
}

const verifyEmail = async (email: string, name: string, url: string) => {
  // Validate URL before sending to prevent phishing attacks
  const sanitizedUrl = assertValidEmailUrl(url)

  await resend.emails.send({
    from: `10xCoder.club <no-reply@${env.DOMAIN}>`,
    to: email,
    subject: 'Verify your email',
    react: VerificationEmail({ name, url: sanitizedUrl })
  })
  return true
}

const sendMagicLinkEmail = async (email: string, url: string) => {
  // Validate URL before sending to prevent phishing attacks
  const sanitizedUrl = assertValidEmailUrl(url)

  await resend.emails.send({
    from: `10xCoder.club <no-reply@${env.DOMAIN}>`,
    to: email,
    subject: 'Sign in to 10xCoder.club',
    react: MagicLinkEmail({ email, url: sanitizedUrl })
  })
  return true
}

export { verifyEmail, sendResetPasswordEmail, sendMagicLinkEmail }
export default resend
