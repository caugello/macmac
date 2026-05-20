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
    <div className="min-h-screen flex flex-col md:flex-row relative overflow-hidden">
      {/* Warm illustration panel */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-primary via-primary/90 to-primary/70 relative items-center justify-center p-12">
        <div className="absolute inset-0 opacity-[0.04] bg-[url(&quot;data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E&quot;)] bg-repeat bg-[length:256px_256px]" />
        <div className="absolute top-16 left-16 w-64 h-64 rounded-full border-2 border-dashed border-white/10" />
        <div className="absolute bottom-24 right-12 w-48 h-48 rounded-full border-2 border-dashed border-white/10" />
        <div className="relative text-white max-w-md space-y-6 animate-enter">
          <h2 className="text-4xl font-heading font-bold leading-tight">
            AI-powered
            <br />
            meal planning
            <br />
            with real prices.
          </h2>
          <p className="text-white/70 text-lg leading-relaxed">
            Recipes, meal plans, and shopping lists built on a live product catalog — priced,
            scored, and sorted before you reach the store.
          </p>
          <div className="flex items-center gap-3 pt-4">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
              <Icon name="restaurant_menu" size={20} />
            </div>
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
              <Icon name="calendar_month" size={20} />
            </div>
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
              <Icon name="shopping_cart" size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Login form panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-12 bg-background relative">
        <div className="md:hidden absolute -top-32 -right-32 w-96 h-96 rounded-full border-2 border-dashed border-outline-variant/20" />

        <div
          className="w-full max-w-[440px] bg-surface-container-lowest border border-outline-variant rounded-lg p-6 md:p-8 shadow-sm relative z-10 animate-enter"
          style={{ '--enter-delay': '100ms' } as React.CSSProperties}
        >
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-headline-xl font-heading font-bold text-center">MacMac</h1>
            <p className="text-body-lg text-on-surface-variant text-center mt-2">
              AI-powered meal planning. Real store prices.
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-error-container text-on-error-container mb-6">
              <Icon name="warning" size={20} className="shrink-0 mt-0.5" />
              <p className="text-body-md">{error}</p>
            </div>
          )}

          {/* Google Sign-in */}
          <Button
            onClick={handleGoogleSignIn}
            className="w-full rounded-full h-14 text-lg font-semibold flex items-center justify-center gap-3"
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
          <div className="rounded-lg border border-outline-variant bg-surface-container-low p-4 text-center mt-6">
            <p className="text-body-md text-on-surface-variant">
              Sign in with your Google account to get started.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
