import React, { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'

export const Login: React.FC = () => {
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { loginWithGoogle } = useAuth()

  const handleGoogleSignIn = async () => {
    setError(null)
    setIsLoading(true)

    try {
      await loginWithGoogle()
    } catch (err: unknown) {
      console.error('Login error:', err)
      const apiDetail = (err as { response?: { data?: { detail?: string } } }).response?.data
        ?.detail
      const firebaseMessage = (err as { code?: string; message?: string }).message
      setError(apiDetail || firebaseMessage || 'Sign-in failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-cream text-ink">
      {/* Brand / hero panel */}
      <div className="relative hidden md:flex md:w-1/2 flex-col justify-between overflow-hidden bg-ink p-12 text-cream">
        <div className="pointer-events-none absolute -top-24 -right-24 h-80 w-80 rounded-full bg-lime/20" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-coral/20" />

        <div className="relative z-10">
          <span className="font-display text-3xl font-bold tracking-tight">
            MacMac<span className="text-lime">.</span>
          </span>
        </div>

        <div className="relative z-10 max-w-md space-y-6">
          <p className="font-serif text-2xl italic text-lime">Fresh from your store.</p>
          <h2 className="font-display text-5xl font-bold leading-[1.05] tracking-tight">
            AI-powered meal planning with real prices.
          </h2>
          <p className="font-body text-lg leading-relaxed text-cream/70">
            Recipes, meal plans, and shopping lists built on a live product catalog — priced,
            scored, and sorted before you reach the store.
          </p>
          <div className="flex items-center gap-3 pt-2">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-lime text-ink">
              <Icon name="restaurant_menu" size={22} />
            </span>
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-coral text-white">
              <Icon name="calendar_month" size={22} />
            </span>
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-yellow text-ink">
              <Icon name="shopping_cart" size={22} />
            </span>
          </div>
        </div>

        <div className="relative z-10" />
      </div>

      {/* Login form panel */}
      <div className="flex flex-1 flex-col items-center justify-center bg-cream p-6 md:p-12">
        <div className="w-full max-w-[440px] space-y-8">
          {/* Header */}
          <div className="text-center">
            <span className="font-display text-4xl font-bold tracking-tight text-ink md:hidden">
              MacMac<span className="text-lime">.</span>
            </span>
            <h1 className="mt-4 font-display text-3xl font-bold tracking-tight md:mt-0">MacMac</h1>
            <p className="mt-2 font-body text-lg text-ink/60">
              AI-powered meal planning. Real store prices.
            </p>
          </div>

          <div className="rounded-bento border border-border bg-white p-6 md:p-8">
            {error && (
              <div className="mb-6 flex items-start gap-3 rounded-2xl bg-coral/10 p-4 text-ink">
                <Icon name="warning" size={20} className="mt-0.5 shrink-0 text-coral" />
                <p className="font-body text-base">{error}</p>
              </div>
            )}

            {/* Google Sign-in */}
            <Button
              onClick={handleGoogleSignIn}
              variant="accent"
              className="flex h-14 w-full items-center justify-center gap-3 text-lg font-semibold"
              disabled={isLoading}
            >
              {isLoading ? (
                'Signing in...'
              ) : (
                <>
                  <svg viewBox="0 0 24 24" width="20" height="20" className="shrink-0">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Sign in with Google
                </>
              )}
            </Button>

            {/* Sign-in notice */}
            <p className="mt-6 text-center font-body text-base text-ink/60">
              Sign in with your Google account to get started.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
