import "./globals.css";
import type { Metadata } from "next";
import Providers from "./providers";
import { Outfit } from "next/font/google";

const outfit = Outfit({
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Your AI Therapy Guide",
  description:
    "Warm, CBT-based support to explore thoughts, emotions, and behaviors",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${outfit.variable} font-sans antialiased bg-[#fafafa] text-gray-900`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
