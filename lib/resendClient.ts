// lib/resendClient.ts
import { Resend } from "resend";

export function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    // Не падаем при импорте модуля на билде, а даём понятную ошибку только при реальном вызове
    console.error("RESEND_API_KEY is not set. Resend client is not configured.");
    throw new Error("Resend client not configured");
  }

  return new Resend(apiKey);
}


