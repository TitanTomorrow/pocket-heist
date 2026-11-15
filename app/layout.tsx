import type { Metadata } from "next"
// @ts-ignore Next.js handles global CSS imports at build time.
import "@/app/globals.css"

export const metadata: Metadata = {
  title: "Pocket Heist",
  description: "Tiny missions. Big office mischief.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  )
}