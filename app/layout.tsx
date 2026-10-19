import type { Metadata } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/custom/Navbar";
import LocalizedClerkProvider from "@/components/auth/LocalizedClerkProvider";
import { I18nProvider } from "@/lib/i18n/provider";
import { getLocale } from "@/lib/i18n/server";
import { translate } from "@/lib/i18n/translate";
import { Toaster } from "@/components/ui/Toast";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin", "vietnamese"],
});

const metadata: Metadata = {
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

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    ...metadata,
    title: translate(
      locale,
      "MindBridge AI - Your trusted learning companions",
    ),
    description: translate(
      locale,
      "Real-time AI Teaching / E-Learning Platform",
    ),
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  return (
    <html lang={locale}>
      <body className={`${bricolage.variable} antialiased`}>
        <I18nProvider initialLocale={locale}>
          <LocalizedClerkProvider>
            <Toaster duration={8000} />
            <Navbar />
            {children}
          </LocalizedClerkProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
