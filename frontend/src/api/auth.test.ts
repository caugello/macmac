import { describe, it, expect, beforeEach, vi } from 'vitest'
import { authApi } from './auth'
import { apiClient } from './client'

// Mock the apiClient
vi.mock('./client', () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  },
}))

describe('authApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('login', () => {
    it('should call POST /auth/login with credentials', async () => {
      const mockResponse = {
        data: {
          access_token: 'token-123',
          token_type: 'bearer',
          user: {
            id: '1',
            username: 'testuser',
            email: 'test@example.com',
            groups: [],
          },
        },
      }

      vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

      const result = await authApi.login({ username: 'testuser', password: 'password' })

      expect(apiClient.post).toHaveBeenCalledWith('/auth/login', {
        username: 'testuser',
        password: 'password',
      })
      expect(result).toEqual(mockResponse.data)
    })

    it('should throw error on login failure', async () => {
      const mockError = new Error('Invalid credentials')
      vi.mocked(apiClient.post).mockRejectedValue(mockError)

      await expect(
        authApi.login({ username: 'wrong', password: 'wrong' })
      ).rejects.toThrow('Invalid credentials')
    })
  })

  describe('me', () => {
    it('should call GET /auth/me', async () => {
      const mockResponse = {
        data: {
          id: '1',
          username: 'testuser',
          email: 'test@example.com',
          groups: ['group1'],
        },
      }

      vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

      const result = await authApi.me()

      expect(apiClient.get).toHaveBeenCalledWith('/auth/me')
      expect(result).toEqual(mockResponse.data)
    })
  })

  describe('createGroup', () => {
    it('should call POST /auth/groups with group data', async () => {
      const mockResponse = {
        data: {
          id: 'group-123',
          name: 'Family',
          owner_id: 'user-1',
          member_count: 1,
        },
      }

      vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

      const result = await authApi.createGroup({ name: 'Family' })

      expect(apiClient.post).toHaveBeenCalledWith('/auth/groups', { name: 'Family' })
      expect(result).toEqual(mockResponse.data)
    })
  })

  describe('listGroups', () => {
    it('should call GET /auth/groups', async () => {
      const mockResponse = {
        data: {
          total: 2,
          data: [
            { id: 'g1', name: 'Family', owner_id: 'u1', member_count: 3 },
            { id: 'g2', name: 'Friends', owner_id: 'u2', member_count: 5 },
          ],
        },
      }

      vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

      const result = await authApi.listGroups()

      expect(apiClient.get).toHaveBeenCalledWith('/auth/groups')
      expect(result).toEqual(mockResponse.data)
    })
  })

  describe('addMember', () => {
    it('should call POST /auth/groups/:id/members with username', async () => {
      const mockResponse = { data: { success: true } }

      vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

      const result = await authApi.addMember('group-123', { username: 'newuser' })

      expect(apiClient.post).toHaveBeenCalledWith('/auth/groups/group-123/members', {
        username: 'newuser',
      })
      expect(result).toEqual(mockResponse.data)
    })
  })

  describe('removeMember', () => {
    it('should call DELETE /auth/groups/:id/members/:userId', async () => {
      const mockResponse = { data: { success: true } }

      vi.mocked(apiClient.delete).mockResolvedValue(mockResponse)

      const result = await authApi.removeMember('group-123', 'user-456')

      expect(apiClient.delete).toHaveBeenCalledWith('/auth/groups/group-123/members/user-456')
      expect(result).toEqual(mockResponse.data)
    })
  })
})
