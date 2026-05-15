import { describe, it, expect, beforeEach } from 'vitest'
import type { AxiosRequestConfig, InternalAxiosRequestConfig, AxiosResponse } from 'axios'

describe('apiClient', () => {
  beforeEach(() => {
    localStorage.clear()
    // Reset window.location
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { href: '' },
    })
  })

  it('should be configured with correct baseURL', async () => {
    const { apiClient } = await import('./client')
    expect(apiClient.defaults.baseURL).toBe('/api/v1')
  })

  it('should be configured with correct default headers', async () => {
    const { apiClient } = await import('./client')
    expect(apiClient.defaults.headers['Content-Type']).toBe('application/json')
  })

  it('should add Authorization header when token exists in localStorage', async () => {
    const token = 'test-token-123'
    localStorage.setItem('auth_token', token)

    const { apiClient } = await import('./client')
    const config = { headers: {} } as InternalAxiosRequestConfig
    const interceptor = (
      apiClient.interceptors.request as unknown as {
        handlers: { fulfilled: (c: AxiosRequestConfig) => AxiosRequestConfig }[]
      }
    ).handlers[0].fulfilled
    const result = interceptor(config)

    expect(result.headers!.Authorization).toBe(`Bearer ${token}`)
  })

  it('should not add Authorization header when token does not exist', async () => {
    const { apiClient } = await import('./client')
    const config = { headers: {} } as InternalAxiosRequestConfig
    const interceptor = (
      apiClient.interceptors.request as unknown as {
        handlers: { fulfilled: (c: AxiosRequestConfig) => AxiosRequestConfig }[]
      }
    ).handlers[0].fulfilled
    const result = interceptor(config)

    expect(result.headers!.Authorization).toBeUndefined()
  })

  it('should pass through successful responses', async () => {
    const { apiClient } = await import('./client')
    const response = { data: { message: 'success' }, status: 200 } as AxiosResponse
    const interceptor = (
      apiClient.interceptors.response as unknown as {
        handlers: { fulfilled: (r: AxiosResponse) => AxiosResponse }[]
      }
    ).handlers[0].fulfilled
    const result = interceptor(response)

    expect(result).toBe(response)
  })

  it('should handle 401 Unauthorized by clearing localStorage and redirecting', async () => {
    localStorage.setItem('auth_token', 'test-token')
    localStorage.setItem('auth_user', JSON.stringify({ id: '1', username: 'test' }))

    const { apiClient } = await import('./client')
    const error = {
      response: {
        status: 401,
        data: { detail: 'Unauthorized' },
      },
    }

    const interceptor = (
      apiClient.interceptors.response as unknown as {
        handlers: { rejected: (e: typeof error) => Promise<never> }[]
      }
    ).handlers[0].rejected

    await expect(interceptor(error)).rejects.toThrow()

    expect(localStorage.getItem('auth_token')).toBeNull()
    expect(localStorage.getItem('auth_user')).toBeNull()
    expect(window.location.href).toBe('/login')
  })

  it('should not redirect on non-401 errors', async () => {
    const { apiClient } = await import('./client')
    const error = {
      response: {
        status: 500,
        data: { detail: 'Internal Server Error' },
      },
    }

    const interceptor = (
      apiClient.interceptors.response as unknown as {
        handlers: { rejected: (e: typeof error) => Promise<never> }[]
      }
    ).handlers[0].rejected

    await expect(interceptor(error)).rejects.toThrow()
    expect(window.location.href).toBe('')
  })

  it('should handle network errors without response', async () => {
    const { apiClient } = await import('./client')
    const error = {
      message: 'Network Error',
    }

    const interceptor = (
      apiClient.interceptors.response as unknown as {
        handlers: { rejected: (e: typeof error) => Promise<never> }[]
      }
    ).handlers[0].rejected

    await expect(interceptor(error)).rejects.toThrow()
  })
})
