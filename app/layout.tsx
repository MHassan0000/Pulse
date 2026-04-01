import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist_Mono, Sora } from "next/font/google";
import "./globals.css";

const sora = Sora({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pulse",
  description: "Microblogging platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider signInUrl="/sign-in" signUpUrl="/sign-up">
      <html lang="en" className={`dark ${sora.variable} ${geistMono.variable}`}>
        <body
          className="bg-black text-white antialiased"
        >
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
