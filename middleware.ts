import NextAuth from "next-auth";
import { authconfig } from "./auth.config";


export default NextAuth(authconfig).auth 

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
};