import React, { useState, FormEvent } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Icon } from '@/components/ui/icon'

export const Login: React.FC = () => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      await login(username, password)
    } catch (err) {
      console.error('Login error:', err)
      const detail = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
      setError(detail || 'Login failed. Please check your credentials.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-12 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,180,165,0.06),transparent_70%)] relative overflow-hidden">
      {/* Decorative circles */}
      <div className="hidden md:block absolute -top-32 -right-32 w-96 h-96 rounded-full border-2 border-dashed border-outline-variant/20" />
      <div className="hidden md:block absolute -bottom-48 -left-48 w-[32rem] h-[32rem] rounded-full border-2 border-dashed border-outline-variant/15" />

      <div className="w-full max-w-[440px] bg-surface-container-lowest border border-outline-variant rounded-lg p-6 md:p-8 shadow-sm relative z-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-headline-xl font-heading font-bold text-center">MacMac</h1>
          <p className="text-body-lg text-on-surface-variant text-center mt-2">
            Welcome to your digital pantry.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="username" className="text-label-md font-semibold">
              Username
            </Label>
            <Input
              id="username"
              type="text"
              placeholder="christophe"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={isLoading}
              autoComplete="username"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-label-md font-semibold">
                Password
              </Label>
              <span className="text-label-sm text-primary cursor-pointer hover:underline">
                Forgot?
              </span>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="test"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="current-password"
                className="pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-on-surface-variant hover:text-on-surface transition-colors"
              >
                <Icon name={showPassword ? 'visibility_off' : 'visibility'} size={20} />
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-error-container text-on-error-container">
              <Icon name="warning" size={20} className="shrink-0 mt-0.5" />
              <p className="text-body-md">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            className="w-full rounded-full h-14 text-lg font-semibold flex items-center justify-center gap-2"
            disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Log in'}
            {!isLoading && <Icon name="arrow_forward" size={20} />}
          </Button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px bg-outline-variant" />
          <span className="text-label-sm text-on-surface-variant">or</span>
          <div className="flex-1 h-px bg-outline-variant" />
        </div>

        {/* Demo credentials */}
        <div className="rounded-lg border border-outline-variant bg-surface-container-low p-4 text-center">
          <p className="text-body-md text-on-surface-variant">
            Demo credentials: christophe / test
          </p>
        </div>

        {/* Footer links */}
        <div className="flex items-center justify-between mt-6">
          <span className="text-label-sm text-on-surface-variant">
            New here?{' '}
            <span className="text-primary cursor-pointer hover:underline">Create an account</span>
          </span>
        </div>
      </div>
    </div>
  )
}
