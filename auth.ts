import NextAuth from "next-auth";
import { authconfig } from "./auth.config";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { email } from "zod/v4";
import type { User } from "@/app/lib/definitions"
import bcrypt from 'bcrypt' ;
import postgres from "postgres";

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require'});


async function getUser(email: string): Promise<User | undefined> {
    try {
        const user = await sql<User[]> `SELECT * FROM users WHERE email=${email}`;
        return user[0];
    } catch (error) {
        console.error('Failed to fetch user:', error);
        throw new Error('Failed to fetch user.');

    }
}

export const { auth, signIn, signOut } = NextAuth({
    ...authconfig,
    providers: [
        Credentials({
        async authorize(credentials) {
            const parsedCredentails = z 
            .object({email: z.string().email(), password:z.string().min(6)})
            .safeParse(credentials);

        if (parsedCredentails.success) {
            const { email, password } = parsedCredentails.data;

            const user = await getUser(email);
            if(!user) return null;
            const passwordsMatch = await bcrypt.compare(password, user.password);

            if(passwordsMatch) return user;
        }
        console.log('Invalid credentials');

        return null ;
        },
    })],

});