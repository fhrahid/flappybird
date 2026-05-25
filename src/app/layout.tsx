import { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Flappy Bird Online',
  description: 'Play Flappy Bird with global rankings and live chat',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
