import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'StreamMUSE - Music Generation Showcase',
  description: 'Interactive showcase for StreamMUSE music generation models',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <nav className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-bold text-gray-900">StreamMUSE</h1>
              </div>
              <div className="flex items-center space-x-8">
                <a href="#blind-test" className="text-gray-600 hover:text-gray-900">盲测评测</a>
                <a href="#audio-library" className="text-gray-600 hover:text-gray-900">音频库</a>
                <a href="#rankings" className="text-gray-600 hover:text-gray-900">排行榜</a>
                <a href="#about" className="text-gray-600 hover:text-gray-900">关于</a>
              </div>
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  )
}
