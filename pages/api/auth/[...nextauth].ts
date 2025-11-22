import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import EmailProvider from "next-auth/providers/email";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
// @ts-ignore – PrismaClient тип недоступен на чистой установке, но нужен только в рантайме
import { PrismaClient } from "@prisma/client";
import { Resend } from "resend";

const prisma = new PrismaClient();
const resend = new Resend(process.env.RESEND_API_KEY!);

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    EmailProvider({
      sendVerificationRequest: async ({ identifier, url }) => {
        await resend.emails.send({
          from: process.env.EMAIL_FROM!,
          to: identifier,
          subject: "Sign in to LLMO Directory",
          html: `
            <div style="font-family:sans-serif;padding:24px">
              <h2>🔗 LLMO Directory</h2>
              <p>Click the button below to log in:</p>
              <a href="${url}" style="background:#22c55e;color:white;padding:12px 20px;text-decoration:none;border-radius:6px;display:inline-block;margin-top:16px;">Log in</a>
              <p style="margin-top:16px;font-size:12px;color:#666">If you didn't request this, please ignore this email.</p>
              <p style="margin-top:16px;font-size:12px;color:#999">This link will expire in 24 hours.</p>
            </div>
          `,
        });
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

export default NextAuth(authOptions);
