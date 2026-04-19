import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/prisma";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  plugins: [nextCookies()],
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_OAUTH_CLIENT_ID ?? "",
      clientSecret: process.env.GITHUB_OAUTH_CLIENT_SECRET ?? "",
      scope: ["read:user", "user:email"],
    },
  },
});
