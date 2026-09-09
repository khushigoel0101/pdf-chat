import type { Metadata } from 'next'
import { ClerkProvider, Show, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'PDF RAG App',
  description: 'LangChain & Gemini PDF Workspace',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-white text-gray-900">
        <ClerkProvider>
          {/* Global Header Bar */}
          <header className="items-center justify-between flex px-6 py-4 border-b border-gray-200 w-full h-[65px]">
            <h1 className="font-bold text-lg">PDF Assistant</h1>

            <Show
              when="signed-in"
              fallback={
                <div className="flex items-center gap-3">
                  <SignInButton mode="modal">
                    <button className="text-sm font-medium text-gray-700 hover:text-gray-900 px-3 py-1.5">
                      Sign In
                    </button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <button className="bg-[#6c47ff] hover:bg-[#5b3adb] text-white rounded-full font-medium text-sm px-4 py-2 transition">
                      Sign Up
                    </button>
                  </SignUpButton>
                </div>
              }
            >
              <UserButton />
            </Show>
          </header>

          {/* Page Content */}
          <main className="flex-1">
            {children}
          </main>
        </ClerkProvider>
      </body>
    </html>
  )
}