import NextAuth, { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import EmailProvider from "next-auth/providers/email";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";
import { getResendClient } from "@/lib/resendClient";

const prisma = new PrismaClient();

/**
 * Проверяет наличие всех обязательных переменных окружения для NextAuth
 * @returns массив ошибок конфигурации (пустой, если всё в порядке)
 */
function validateAuthConfig(): string[] {
  const errors: string[] = [];

  if (!process.env.NEXTAUTH_SECRET) {
    errors.push("NEXTAUTH_SECRET is not set");
  }

  if (!process.env.GOOGLE_CLIENT_ID) {
    errors.push("GOOGLE_CLIENT_ID is not set");
  }

  if (!process.env.GOOGLE_CLIENT_SECRET) {
    errors.push("GOOGLE_CLIENT_SECRET is not set");
  }

  if (!process.env.EMAIL_FROM) {
    errors.push("EMAIL_FROM is not set");
  }

  if (!process.env.RESEND_API_KEY) {
    errors.push("RESEND_API_KEY is not set");
  }

  return errors;
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    EmailProvider({
      async sendVerificationRequest({ identifier, url }) {
        const from = process.env.EMAIL_FROM;

        if (!from) {
          console.error("[auth/email] EMAIL_FROM is not configured");
          throw new Error("EMAIL_FROM is not configured");
        }

        const resend = getResendClient();

        try {
          const { error } = await resend.emails.send({
            from,
            to: identifier,
            subject: "Sign in to LLMO Directory",
            html: `
              <p>Click the link below to sign in to LLMO Directory:</p>
              <p><a href="${url}">${url}</a></p>
              <p>If you did not request this email, you can safely ignore it.</p>
            `,
          });

          if (error) {
            console.error("[auth/email] Resend error:", error);
            throw new Error("Unable to send verification email");
          }
        } catch (err) {
          console.error("[auth/email] Unexpected error:", err);
          throw new Error("Unable to send verification email");
        }
      },
    }),
  ],
  session: { strategy: "jwt" as const },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
    verifyRequest: "/login?verify=true",
  },
  callbacks: {
    async jwt({ token, user }: { token: any; user?: any }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }: { session: any; token: any }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
};

// Проверяем конфигурацию при инициализации
const configErrors = validateAuthConfig();
if (configErrors.length > 0) {
  console.error("NextAuth configuration errors:");
  configErrors.forEach((error) => console.error(`  - ${error}`));
}

export default NextAuth(authOptions);
