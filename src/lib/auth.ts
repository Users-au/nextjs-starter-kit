import type { AuthOptions } from "next-auth"
import type { JWT } from "next-auth/jwt"

// Define Usersau OAuth provider
const UsersauProvider = {
  id: "usersau",
  name: "Usersau",
  type: "oauth" as const,
  authorization: {
    url: `${process.env.USERSAU_HOST}/oauth/authorize`,
    params: {
      scope: "read",
      response_type: "code",
    },
  },
  token: `${process.env.USERSAU_HOST}/oauth/token`,
  userinfo: `${process.env.USERSAU_HOST}/api/user`,
  clientId: process.env.USERSAU_CLIENT_ID,
  clientSecret: process.env.USERSAU_CLIENT_SECRET,
  profile(profile: any) {
    return {
      id: profile.id.toString(),
      name: profile.name,
      email: profile.email,
      image: profile.avatar || null,
      usersau_id: profile.id,
    }
  },
}

export const authOptions: AuthOptions = {
  providers: [UsersauProvider],
  pages: {
    signIn: "/auth/login",
  },
  callbacks: {
    async jwt({ token, account, profile }: { token: JWT; account?: any; profile?: any }) {
      // Persist the OAuth access_token to the token right after signin
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.usersauId = profile?.id
      }
      return token
    },
    async session({ session, token }: { session: any; token: JWT }) {
      // Send properties to the client
      session.accessToken = token.accessToken
      session.refreshToken = token.refreshToken
      session.user.usersauId = token.usersauId
      return session
    },
  },
  session: {
    strategy: "jwt",
  },
} 