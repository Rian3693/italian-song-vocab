import './globals.css'

export const metadata = {
  title: 'Italian Song Vocabulary',
  description: 'Learn Italian through music',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
