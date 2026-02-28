import { Autosend } from "autosendjs";

import { env } from "../config/env";
import { logger } from "./logger";
import { addEmailJob } from "./email-queue";
import type { EmailJobData } from "./email-queue";

const autosend = new Autosend(env.AUTOSEND_API_KEY);

// ── Low-level send (used by the worker) ──────────

interface SendEmailParams {
  to: string;
  subject: string;
  templateId: string;
  dynamicData: Record<string, string>;
}

export async function sendEmail(params: SendEmailParams): Promise<void> {
  await autosend.emails.send({
    from: { email: `no-reply@${env.DOMAIN}`, name: "10xCoder.club" },
    to: { email: params.to },
    subject: params.subject,
    templateId: params.templateId,
    dynamicData: params.dynamicData,
  });
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
    subject: "Verify your email",
    // TODO: Add Autosend template ID for verification email
    templateId: "VERIFICATION_TEMPLATE_ID",
    dynamicData: { name, url },
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
    subject: "Reset your password",
    // TODO: Add Autosend template ID for reset password email
    templateId: "RESET_PASSWORD_TEMPLATE_ID",
    dynamicData: { name, url },
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
    // TODO: Add Autosend template ID for magic link email
    templateId: "MAGIC_LINK_TEMPLATE_ID",
    dynamicData: { email, url },
  };

  await addEmailJob(data);
  logger.info({ email, type: data.type }, "Magic link email queued");
};

export default autosend;
