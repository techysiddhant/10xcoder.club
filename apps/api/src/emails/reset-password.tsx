import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Section,
  Tailwind,
  Text
} from '@react-email/components'

interface ResetPasswordEmailProps {
  name: string
  url: string
}

/**
 * Defensive URL validation for email templates.
 * This is a fallback safety check - primary validation should happen in resend.ts
 */
function isUrlSafe(url: string): boolean {
  try {
    const parsed = new URL(url)
    // Only allow https (or http for localhost in development)
    const isLocalhost = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1'
    if (parsed.protocol !== 'https:' && !(isLocalhost && parsed.protocol === 'http:')) {
      console.error(`[ResetPasswordEmail] Blocked unsafe URL scheme: ${parsed.protocol}`)
      return false
    }
    // Reject URLs with embedded credentials
    if (parsed.username || parsed.password) {
      console.error('[ResetPasswordEmail] Blocked URL with embedded credentials')
      return false
    }
    return true
  } catch {
    console.error(`[ResetPasswordEmail] Invalid URL format: ${url}`)
    return false
  }
}

export default function ResetPasswordEmail({ name, url }: Readonly<ResetPasswordEmailProps>) {
  const safeUrl = isUrlSafe(url) ? url : undefined

  return (
    <Html>
      <Head />
      <Tailwind>
        <Body className="font-sans py-[40px] bg-[#f3f4f6]">
          <Container className="bg-white rounded-[16px] mx-auto p-[48px] max-w-[500px] shadow-sm">
            <Section className="mb-[32px]">
              <Text className="text-[24px] font-bold text-[#f59e0b] m-0">10xCoder.club</Text>
            </Section>
            <Section>
              <Heading className="text-[28px] font-bold text-[#111827] m-0 mb-[24px]">
                Reset your password
              </Heading>
              <Text className="text-[16px] leading-[24px] text-[#4b5563] m-0 mb-[16px]">
                Hey {name},
              </Text>
              <Text className="text-[16px] leading-[24px] text-[#4b5563] m-0 mb-[24px]">
                We received a request to reset your password for your 10xCoder.club account. Click
                the button below to create a new password.
              </Text>
              <Section className="mb-[32px] mt-4">
                {safeUrl ? (
                  <Button
                    className="bg-[#f59e0b] text-white font-medium py-[12px] px-[20px] rounded-[8px] text-[14px] no-underline text-center box-border"
                    href={safeUrl}
                  >
                    Reset Password
                  </Button>
                ) : (
                  <Text className="text-[14px] text-[#dc2626] font-medium">
                    Unable to generate reset link. Please contact support.
                  </Text>
                )}
              </Section>
              <Text className="text-[14px] leading-[20px] text-[#6b7280] m-0 mb-[16px]">
                This link will expire in 1 hour. If you didn't request a password reset, you can
                safely ignore this email — your password will remain unchanged.
              </Text>
              <Hr className="border-[#e5e7eb] my-[32px]" />
              <Text className="text-[14px] leading-[20px] text-[#6b7280] m-0">
                Need help?{' '}
                <Link href="mailto:support@10xcoder.club" className="text-[#f59e0b] no-underline">
                  Contact our support team
                </Link>
              </Text>
            </Section>
            <Section className="mt-[32px] pt-[32px] border-t border-[#e5e7eb]">
              <Text className="text-[12px] text-[#9ca3af] text-center m-0">
                © {new Date().getFullYear()} 10xCoder.club. All rights reserved.
              </Text>
              <Text className="text-[12px] text-[#9ca3af] text-center m-0">
                Helping developers level up their coding skills
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}

ResetPasswordEmail.PreviewProps = {
  name: 'John Doe',
  url: 'https://10xcoder.club/reset-password?token=abc123'
}
