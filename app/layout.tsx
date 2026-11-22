import type { Metadata } from "next"
import { Big_Shoulders_Stencil, Inter } from "next/font/google"
import "@/app/globals.css"
import UserProvider from "@/components/UserProvider"

export const metadata: Metadata = {
  // Each page sets its own title so tabs and screen readers can tell pages apart
  title: {
    template: "%s | Pocket Heist",
    default: "Pocket Heist",
  },
  description: "Steal the stapler. Keep your job.",
}

// Re-render every route at most once a day, so the Footer's server-rendered
// year rolls over at New Year without a redeploy
export const revalidate = 86400

// Self-hosted by next/font; globals.css maps these variables to font-sans and font-stencil
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" })
// next/font has no metrics for this font, so its size-adjusted fallback is
// turned off (which silences the build warning) and a condensed system font
// stands in while it loads
const stencil = Big_Shoulders_Stencil({
  subsets: ["latin"],
  weight: "800",
  variable: "--font-big-shoulders-stencil",
  display: "swap",
  adjustFontFallback: false,
  fallback: ["Impact", "Arial Narrow", "sans-serif"],
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${stencil.variable}`}>
      <body>
        <UserProvider>{children}</UserProvider>
      </body>
    </html>
  )
}