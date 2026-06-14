import { Email } from "@convex-dev/auth/providers/Email";
import axios from "axios";
import { RandomReader, generateRandomString } from "@oslojs/crypto/random";

const EMAIL_API_KEY_ENV_VAR = "VLY_EMAIL_API_KEY";

export const emailOtp = Email({
  id: "email-otp",
  maxAge: 60 * 15, // 15 minutes
  // This function can be asynchronous
  async generateVerificationToken() {
    const random: RandomReader = {
      read(bytes: Uint8Array) {
        crypto.getRandomValues(bytes);
      },
    };
    const alphabet = "0123456789";
    return generateRandomString(random, alphabet, 6);
  },
  async sendVerificationRequest({ identifier: email, token }) {
    const emailApiKey = process.env[EMAIL_API_KEY_ENV_VAR];
    if (!emailApiKey) {
      throw new Error(
        `${EMAIL_API_KEY_ENV_VAR} is required to send email OTPs.`,
      );
    }

    try {
      await axios.post(
        "https://email.freebuff.com/send_otp",
        {
          to: email,
          otp: token,
          appName: process.env.VLY_APP_NAME || "a freebuff.com application",
        },
        {
          headers: {
            "x-api-key": emailApiKey,
          },
        },
      );
    } catch {
      throw new Error("Unable to send verification email.");
    }
  },
});
