import { Autosend } from "autosendjs";

import { env } from "@/config/env";
import { logger } from "@/lib/logger";
import { addEmailJob } from "@/lib/email-queue";
import type { EmailJobData } from "@/lib/email-queue";
import { EMAIL_TEMPLATE_IDS } from "@/constant";

const autosend = new Autosend(env.AUTOSEND_API_KEY);

// ── Low-level send (used by the worker) ──────────

interface SendEmailParams {
  to: string;
  subject: string;
  templateId: string;
  dynamicData: Record<string, string>;
}

export async function sendEmail(params: SendEmailParams): Promise<void> {
  const response = await autosend.emails.send({
    from: { email: `no-reply@${env.DOMAIN}`, name: "10xCoder-club" },
    to: { email: params.to },
    subject: params.subject,
    templateId: params.templateId,
    dynamicData: params.dynamicData,
  });
  logger.info({ response }, "Email sent successfully");
}

// ── Queue-based senders (used by auth callbacks) ─

export const sendVerificationEmail = async (
  email: string,
  name: string,
  url: string,
): Promise<void> => {
  const data: EmailJobData = {
    type: "verification",
    to: email,
    subject: "Verify Your Email Address",
    templateId: EMAIL_TEMPLATE_IDS.VERIFICATION,
    dynamicData: {
      name,
      verificationLink: url,
      year: new Date().getFullYear().toString(),
    },
  };

  await addEmailJob(data);
  logger.info({ email, type: data.type }, "Verification email queued");
};

export const sendResetPasswordEmail = async (
  email: string,
  name: string,
  url: string,
): Promise<void> => {
  const data: EmailJobData = {
    type: "reset-password",
    to: email,
    subject: "Reset Your Password",
    templateId: EMAIL_TEMPLATE_IDS.RESET_PASSWORD,
    dynamicData: {
      name,
      resetPasswordLink: url,
      year: new Date().getFullYear().toString(),
    },
  };

  await addEmailJob(data);
  logger.info({ email, type: data.type }, "Reset password email queued");
};

export const sendMagicLinkEmail = async (
  email: string,
  url: string,
): Promise<void> => {
  const data: EmailJobData = {
    type: "magic-link",
    to: email,
    subject: "Sign in to 10xCoder.club",
    templateId: EMAIL_TEMPLATE_IDS.MAGIC_LINK,
    dynamicData: {
      email,
      magicLink: url,
      year: new Date().getFullYear().toString(),
    },
  };

  await addEmailJob(data);
  logger.info({ email, type: data.type }, "Magic link email queued");
};

export default autosend;
