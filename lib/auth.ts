// lib/auth.ts
import type { NextAuthOptions } from "next-auth";
// GoogleProvider import removed
import CredentialsProvider from "next-auth/providers/credentials";
import { MongoDBAdapter } from "@next-auth/mongodb-adapter";
import clientPromise from "@/lib/mongodb";

export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(clientPromise),
  providers: [
  // GoogleProvider removed
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        isRegister: { label: "Register", type: "text", optional: true },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = credentials.email;
        const password = credentials.password;
        const isRegister = credentials.isRegister === "true";
        const client = await clientPromise;
        const db = client.db();
        const users = db.collection("users");

        if (isRegister) {
          const existing = await users.findOne({ email });
          if (existing) throw new Error("User already exists");
          await users.insertOne({ email, password, name: email.split("@")[0] });
          return { id: email, email, name: email.split("@")[0] };
        } else {
          const user = await users.findOne({ email, password });
          if (!user) throw new Error("Invalid email or password");
          return { id: user.email, email: user.email, name: user.name };
        }
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/auth" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user = {
          ...session.user,
          email: token.email as string,
          name: token.name as string,
        };
      }
      return session;
    },
  },
};
