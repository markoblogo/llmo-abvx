import { type NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

const resend = new Resend(process.env.RESEND_API_KEY);

// Use service role key for server-side operations to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

export async function POST(request: NextRequest) {
  try {
    const { name, email, message } = await request.json();

    // Validate input
    if (!name || !email || !message) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    // Get contact email from environment variable
    const contactEmail = process.env.CONTACT_EMAIL || process.env.ADMIN_EMAIL || "a.biletskiy@gmail.com";

    const subject = `Contact Form: Message from ${name}`;
    let emailStatus: "sent" | "failed" = "sent";
    let errorMessage: string | null = null;

    try {
      // Send email via Resend
      await resend.emails.send({
        from: "LLMO Directory <no-reply@llmo.directory>",
        to: contactEmail,
        replyTo: email,
        subject: subject,
        html: `
          <div style="font-family: 'IBM Plex Mono', monospace; background-color: #000; color: #00FF9C; padding: 20px;">
            <h2 style="color: #00FF9C;">// NEW CONTACT FORM SUBMISSION</h2>
            <p><strong>From:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Message:</strong></p>
            <div style="background-color: #111; padding: 15px; border-left: 3px solid #00FF9C; margin: 10px 0;">
              ${message.replace(/\n/g, "<br>")}
            </div>
            <p style="margin-top: 20px; color: #888;">// SYSTEM MESSAGE: Contact form submitted successfully.</p>
          </div>
        `,
      });
    } catch (emailError: any) {
      console.error("[contact] Error sending email:", emailError);
      emailStatus = "failed";
      errorMessage = emailError?.message || "Failed to send email";
      // Don't fail the request if email fails, but log it
    }

    // Log email to email_logs table
    try {
      const { error: logError } = await supabaseAdmin.from("email_logs").insert({
        recipient_email: contactEmail,
        subject: subject,
        status: emailStatus,
        error_message: errorMessage,
      });

      if (logError) {
        console.error("[contact] Error logging email to database:", logError);
        // Don't fail the request if logging fails
      }
    } catch (logError: any) {
      console.error("[contact] Error logging email:", logError);
      // Don't fail the request if logging fails
    }

    // Return success even if email failed (we logged the error)
    // This prevents users from seeing errors if email service is down
    if (emailStatus === "failed") {
      console.error("[contact] Email failed but request succeeded. Check email_logs for details.");
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error("[contact] Contact form error:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
