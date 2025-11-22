import { Resend } from "resend"
import { supabase } from "./supabaseClient"

const resend = new Resend(process.env.RESEND_API_KEY!)

interface EmailResult {
  success: boolean
  error?: string
}

interface SendEmailParams {
  to: string
  subject: string
  html: string
}

/**
 * Generic email sending function
 */
export async function sendEmail({ to, subject, html }: SendEmailParams): Promise<boolean> {
  try {
    const { error } = await resend.emails.send({
      from: "LLMO Directory <no-reply@llmo.directory>",
      to,
      subject,
      html,
    })

    // Log the email send attempt
    await supabase.from("email_logs").insert({
      recipient_email: to,
      subject,
      status: error ? "failed" : "sent",
      error_message: error ? JSON.stringify(error) : null,
    })

    if (error) {
      console.error("[v0] Error sending email:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("[v0] Error in sendEmail:", error)

    // Log the failed attempt
    await supabase.from("email_logs").insert({
      recipient_email: to,
      subject,
      status: "failed",
      error_message: error instanceof Error ? error.message : "Unknown error",
    })

    return false
  }
}

/**
 * Generate HTML template for expiry reminder email
 */
export function generateExpiryReminderEmail(userName: string, expiryDate: string, daysLeft: number): string {
  return `
    <body style="font-family: 'IBM Plex Mono', monospace; background-color: #000; color: #00FF9C; padding: 20px;">
      <h2>// SYSTEM NOTICE</h2>
      <p>Hello ${userName},</p>
      <p>Your free LLMO Directory listing will expire in ${daysLeft} days (on ${new Date(expiryDate).toLocaleDateString()}).</p>
      <p>To keep your visibility active, you can:</p>
      <ul>
        <li>Add a backlink to your site, or</li>
        <li>Upgrade to Pro for €1/year and stay visible permanently.</li>
      </ul>
      <p><a href="https://llmo.directory/pricing" style="color:#00FF9C; text-decoration: underline;">→ Upgrade Now</a></p>
      <p style="margin-top:20px;">// SYSTEM MESSAGE: Reminder sent successfully.</p>
    </body>
  `
}

/**
 * Send a reminder email to a user
 */
export async function sendReminderEmail(
  email: string,
  userName: string,
  expiryDate: string,
  daysLeft: number,
): Promise<EmailResult> {
  const html = generateExpiryReminderEmail(userName, expiryDate, daysLeft)
  try {
    const { error } = await resend.emails.send({
      from: "LLMO Directory <no-reply@llmo.directory>",
      to: email,
      subject: "Your LLMO Directory listing is about to expire",
      html,
    })

    // Log the email send attempt
    await supabase.from("email_logs").insert({
      recipient_email: email,
      subject: "Your LLMO Directory listing is about to expire",
      status: error ? "failed" : "sent",
      error_message: error ? JSON.stringify(error) : null,
    })

    if (error) {
      console.error("[v0] Error sending reminder email:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("[v0] Error in sendReminderEmail:", error)

    // Log the failed attempt
    await supabase.from("email_logs").insert({
      recipient_email: email,
      subject: "Your LLMO Directory listing is about to expire",
      status: "failed",
      error_message: error instanceof Error ? error.message : "Unknown error",
    })

    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

/**
 * Send a test email
 */
export async function sendTestEmail(email: string): Promise<EmailResult> {
  try {
    const { error } = await resend.emails.send({
      from: "LLMO Directory <no-reply@llmo.directory>",
      to: email,
      subject: "Test Email from LLMO Directory Admin",
      html: `
        <body style="font-family: 'IBM Plex Mono', monospace; background-color: #000; color: #00FF9C; padding: 20px;">
          <h2>// TEST EMAIL</h2>
          <p>This is a test email from the LLMO Directory admin panel.</p>
          <p>If you're receiving this, the email system is working correctly.</p>
          <p style="margin-top: 20px;">// SYSTEM MESSAGE: Test email sent successfully.</p>
        </body>
      `,
    })

    // Log the email send attempt
    await supabase.from("email_logs").insert({
      recipient_email: email,
      subject: "Test Email from LLMO Directory Admin",
      status: error ? "failed" : "sent",
      error_message: error ? JSON.stringify(error) : null,
    })

    if (error) {
      console.error("[v0] Error sending test email:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("[v0] Error in sendTestEmail:", error)

    // Log the failed attempt
    await supabase.from("email_logs").insert({
      recipient_email: email,
      subject: "Test Email from LLMO Directory Admin",
      status: "failed",
      error_message: error instanceof Error ? error.message : "Unknown error",
    })

    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}
