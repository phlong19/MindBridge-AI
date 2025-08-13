import type { Metadata } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/custom/Navbar";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "@/components/ui/Toast";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MindBridge AI - Your trusted learning companions",
  description: "Real-time AI Teaching / E-Learning Platform",
  creator: "phl19.dev@gmail.com",
  keywords: [
    "AI",
    "ai",
    "mentor",
    "mindbridgeai",
    "ai learning companions",
    "voice-based ai tutor",
    "ai voice learning assistant",
    "ai study buddy",
    "virtual learning assistant",
    "chat with ai companion",
    "ai-powered voice chat for learning",
    "ai tutor platform",
    "stripe ready ai saas",
    "monetizable ai assistant",
    "ai learning platform",
    "voice ai for education",
    "ai chat for students",
    "learn with ai",
  ],
  category: "AI voice learning assistant",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider appearance={{ variables: { colorPrimary: "#fe5933" } }}>
      <html lang="en">
        <body className={`${bricolage.variable} antialiased`}>
          <Toaster duration={8000} />
          <Navbar />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
