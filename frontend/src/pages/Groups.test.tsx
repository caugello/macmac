import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Groups } from './Groups'

const mockUser = {
  id: 'user-1',
  username: 'testuser',
  email: 'test@test.com',
  groups: [],
  pending_invitations: 0,
}

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}))

const mockListGroups = vi.fn()
const mockCreateGroup = vi.fn()
const mockInviteMember = vi.fn()
const mockRemoveMember = vi.fn()
const mockListInvitations = vi.fn()
const mockRespondToInvitation = vi.fn()
const mockListGroupInvitations = vi.fn()
const mockCancelInvitation = vi.fn()
const mockLeaveGroup = vi.fn()
const mockDeleteGroup = vi.fn()

vi.mock('@/api/auth', () => ({
  authApi: {
    listGroups: (...args: unknown[]) => mockListGroups(...args),
    createGroup: (...args: unknown[]) => mockCreateGroup(...args),
    inviteMember: (...args: unknown[]) => mockInviteMember(...args),
    removeMember: (...args: unknown[]) => mockRemoveMember(...args),
    listInvitations: (...args: unknown[]) => mockListInvitations(...args),
    respondToInvitation: (...args: unknown[]) => mockRespondToInvitation(...args),
    listGroupInvitations: (...args: unknown[]) => mockListGroupInvitations(...args),
    cancelInvitation: (...args: unknown[]) => mockCancelInvitation(...args),
    leaveGroup: (...args: unknown[]) => mockLeaveGroup(...args),
    deleteGroup: (...args: unknown[]) => mockDeleteGroup(...args),
  },
}))

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return Wrapper
}

describe('Groups Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockListInvitations.mockResolvedValue({ data: [], total: 0 })
    mockListGroupInvitations.mockResolvedValue({ data: [], total: 0 })
  })

  describe('loading state', () => {
    it('should show loading skeleton', () => {
      mockListGroups.mockReturnValue(new Promise(() => {}))
      const { container } = render(<Groups />, { wrapper: createWrapper() })
      expect(container.querySelector('.skeleton-shimmer')).toBeInTheDocument()
    })
  })

  describe('empty state', () => {
    it('should show empty message when no groups exist', async () => {
      mockListGroups.mockResolvedValue({ data: [], total: 0 })
      render(<Groups />, { wrapper: createWrapper() })

      expect(await screen.findByText('No groups yet')).toBeInTheDocument()
      expect(screen.getByText("You don't belong to any groups yet")).toBeInTheDocument()
    })

    it('should show create first group button', async () => {
      mockListGroups.mockResolvedValue({ data: [], total: 0 })
      render(<Groups />, { wrapper: createWrapper() })

      expect(await screen.findByText('Create Your First Group')).toBeInTheDocument()
    })
  })

  describe('with groups', () => {
    const groups = {
      data: [
        {
          id: 'g1',
          name: 'Smith Family',
          owner_id: 'user-1',
          member_count: 3,
          members: [
            { id: 'user-1', username: 'testuser', email: 'test@test.com' },
            { id: 'user-3', username: 'Alice', email: 'alice@test.com' },
            { id: 'user-4', username: 'Bob', email: 'bob@test.com' },
          ],
        },
        { id: 'g2', name: 'Cooking Club', owner_id: 'user-2', member_count: 5, members: [] },
      ],
      total: 2,
    }

    beforeEach(() => {
      mockListGroups.mockResolvedValue(groups)
    })

    it('should render page title', async () => {
      render(<Groups />, { wrapper: createWrapper() })
      expect(await screen.findByText('Groups')).toBeInTheDocument()
    })

    it('should render group names', async () => {
      render(<Groups />, { wrapper: createWrapper() })
      expect(await screen.findByText('Smith Family')).toBeInTheDocument()
      expect(screen.getByText('Cooking Club')).toBeInTheDocument()
    })

    it('should show owner badge for owned groups', async () => {
      render(<Groups />, { wrapper: createWrapper() })
      expect(await screen.findByText('Owner')).toBeInTheDocument()
    })

    it('should show member count', async () => {
      render(<Groups />, { wrapper: createWrapper() })
      expect(await screen.findByText(/3 members/)).toBeInTheDocument()
      expect(screen.getByText(/5 members/)).toBeInTheDocument()
    })

    it('should show invite form for owned groups only', async () => {
      render(<Groups />, { wrapper: createWrapper() })
      expect(await screen.findByText('Invite by email')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('name@example.com')).toBeInTheDocument()
    })

    it('should render sidebar create group form on desktop', async () => {
      render(<Groups />, { wrapper: createWrapper() })
      await screen.findByText('Smith Family')
      expect(screen.getByRole('heading', { name: 'Create Group' })).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Smith Family')).toBeInTheDocument()
    })

    it('should show delete button for owned groups', async () => {
      render(<Groups />, { wrapper: createWrapper() })
      await screen.findByText('Smith Family')
      expect(screen.getByText('Delete Group')).toBeInTheDocument()
    })

    it('should show leave button for non-owned groups', async () => {
      render(<Groups />, { wrapper: createWrapper() })
      await screen.findByText('Cooking Club')
      expect(screen.getByText('Leave Group')).toBeInTheDocument()
    })
  })

  describe('invitations', () => {
    it('should show pending invitations', async () => {
      mockListGroups.mockResolvedValue({ data: [], total: 0 })
      mockListInvitations.mockResolvedValue({
        data: [
          {
            id: 'inv-1',
            group_id: 'g1',
            group_name: 'Smith Family',
            email: 'test@test.com',
            invited_by: 'user-2',
            inviter_name: 'Jane',
            status: 'pending',
            created_at: '2026-05-17T00:00:00Z',
          },
        ],
        total: 1,
      })
      render(<Groups />, { wrapper: createWrapper() })

      expect(await screen.findByText('Pending Invitations')).toBeInTheDocument()
      expect(screen.getByText('Smith Family')).toBeInTheDocument()
      expect(screen.getByText('Invited by Jane')).toBeInTheDocument()
      expect(screen.getByText('Accept')).toBeInTheDocument()
      expect(screen.getByText('Decline')).toBeInTheDocument()
    })

    it('should call respondToInvitation on accept', async () => {
      const user = userEvent.setup()
      mockListGroups.mockResolvedValue({ data: [], total: 0 })
      mockListInvitations.mockResolvedValue({
        data: [
          {
            id: 'inv-1',
            group_id: 'g1',
            group_name: 'Smith Family',
            email: 'test@test.com',
            invited_by: 'user-2',
            inviter_name: 'Jane',
            status: 'pending',
            created_at: '2026-05-17T00:00:00Z',
          },
        ],
        total: 1,
      })
      mockRespondToInvitation.mockResolvedValue({ message: 'Invitation accepted' })

      render(<Groups />, { wrapper: createWrapper() })
      await screen.findByText('Accept')
      await user.click(screen.getByText('Accept'))

      expect(mockRespondToInvitation).toHaveBeenCalledWith('inv-1', { action: 'accept' })
    })
  })

  describe('create group', () => {
    it('should call createGroup on form submit', async () => {
      const user = userEvent.setup()
      mockListGroups.mockResolvedValue({ data: [], total: 0 })
      mockCreateGroup.mockResolvedValue({
        id: 'new-group',
        name: 'New Group',
        owner_id: 'user-1',
        member_count: 1,
      })

      render(<Groups />, { wrapper: createWrapper() })

      await screen.findByText('No groups yet')

      const nameInput = screen.getByPlaceholderText('Smith Family')
      const submitButton = screen
        .getAllByRole('button', { name: 'Create Group' })
        .find((el) => el.getAttribute('type') === 'submit')!

      await user.type(nameInput, 'New Group')
      await user.click(submitButton)

      expect(mockCreateGroup).toHaveBeenCalledWith({ name: 'New Group' })
    })
  })
})
