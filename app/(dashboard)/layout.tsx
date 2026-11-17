// components
import Navbar from "@/components/Navbar"
import RequireAuth from "@/components/RequireAuth"

export default function HeistsLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <>
      <Navbar />
      <main>
        <RequireAuth>{children}</RequireAuth>
      </main>
    </>
  )
}
