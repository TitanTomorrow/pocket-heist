import type { Metadata } from "next"

// The /heists page is a client component, which can't export metadata, so its
// title is this layout's default. A plain string title here would stop the
// root layout's template reaching the child pages (create, details, reassign),
// so the template is repeated. The default itself still gets the root suffix
export const metadata: Metadata = {
  title: {
    template: "%s | Pocket Heist",
    default: "Your heists",
  },
}

export default function HeistsLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return children
}
