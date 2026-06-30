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
const mockUpdateGroup = vi.fn()

vi.mock('@/api/auth', () => ({
  authApi: {
    listGroups: (...args: unknown[]) => mockListGroups(...args),
    createGroup: (...args: unknown[]) => mockCreateGroup(...args),
    updateGroup: (...args: unknown[]) => mockUpdateGroup(...args),
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
      expect(screen.getByText(/Create a group to share/)).toBeInTheDocument()
    })

    it('should show create first group button', async () => {
      mockListGroups.mockResolvedValue({ data: [], total: 0 })
      render(<Groups />, { wrapper: createWrapper() })

      expect(await screen.findByText('Create your first group')).toBeInTheDocument()
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
      // "Owner" appears as the group badge and on the owner's member row.
      const ownerLabels = await screen.findAllByText('Owner')
      expect(ownerLabels.length).toBeGreaterThan(0)
    })

    it('should show member badge for non-owned groups', async () => {
      render(<Groups />, { wrapper: createWrapper() })
      await screen.findByText('Cooking Club')
      expect(screen.getByText('Member')).toBeInTheDocument()
    })

    it('should mark the current user member row with (you)', async () => {
      render(<Groups />, { wrapper: createWrapper() })
      await screen.findByText('Smith Family')
      expect(screen.getByText('(you)')).toBeInTheDocument()
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

    it('should render the Why groups promo panel', async () => {
      render(<Groups />, { wrapper: createWrapper() })
      await screen.findByText('Smith Family')
      expect(screen.getByRole('heading', { name: 'Why groups?' })).toBeInTheDocument()
    })

    it('should render the Invitations panel', async () => {
      render(<Groups />, { wrapper: createWrapper() })
      await screen.findByText('Smith Family')
      expect(screen.getByRole('heading', { name: 'Invitations' })).toBeInTheDocument()
    })
  })

  describe('invitations', () => {
    const pendingInvitation = {
      id: 'inv-1',
      group_id: 'g1',
      group_name: 'Smith Family',
      email: 'test@test.com',
      invited_by: 'user-2',
      inviter_name: 'Jane',
      status: 'pending',
      created_at: '2026-05-17T00:00:00Z',
    }

    it('should show pending invitations', async () => {
      mockListGroups.mockResolvedValue({ data: [], total: 0 })
      mockListInvitations.mockResolvedValue({ data: [pendingInvitation], total: 1 })
      render(<Groups />, { wrapper: createWrapper() })

      expect(await screen.findByRole('heading', { name: 'Invitations' })).toBeInTheDocument()
      expect(screen.getByText('Smith Family')).toBeInTheDocument()
      expect(screen.getByText('from Jane')).toBeInTheDocument()
      expect(screen.getByText('Accept')).toBeInTheDocument()
      expect(screen.getByText('Decline')).toBeInTheDocument()
    })

    it('should call respondToInvitation on accept', async () => {
      const user = userEvent.setup()
      mockListGroups.mockResolvedValue({ data: [], total: 0 })
      mockListInvitations.mockResolvedValue({ data: [pendingInvitation], total: 1 })
      mockRespondToInvitation.mockResolvedValue({ message: 'Invitation accepted' })

      render(<Groups />, { wrapper: createWrapper() })
      await screen.findByText('Accept')
      await user.click(screen.getByText('Accept'))

      expect(mockRespondToInvitation).toHaveBeenCalledWith('inv-1', { action: 'accept' })
    })

    it('should call respondToInvitation on decline', async () => {
      const user = userEvent.setup()
      mockListGroups.mockResolvedValue({ data: [], total: 0 })
      mockListInvitations.mockResolvedValue({ data: [pendingInvitation], total: 1 })
      mockRespondToInvitation.mockResolvedValue({ message: 'Invitation declined' })

      render(<Groups />, { wrapper: createWrapper() })
      await screen.findByText('Decline')
      await user.click(screen.getByText('Decline'))

      expect(mockRespondToInvitation).toHaveBeenCalledWith('inv-1', { action: 'decline' })
    })
  })

  describe('sent invitations (owner cancel)', () => {
    const ownedGroup = {
      data: [
        {
          id: 'g1',
          name: 'Smith Family',
          owner_id: 'user-1',
          member_count: 1,
          members: [{ id: 'user-1', username: 'testuser', email: 'test@test.com' }],
        },
      ],
      total: 1,
    }

    const sentInvitation = {
      id: 'sent-1',
      group_id: 'g1',
      group_name: 'Smith Family',
      email: 'pending@test.com',
      invited_by: 'user-1',
      inviter_name: 'testuser',
      status: 'pending',
      created_at: '2026-05-17T00:00:00Z',
    }

    it('should show pending sent invitations with a cancel action', async () => {
      mockListGroups.mockResolvedValue(ownedGroup)
      mockListGroupInvitations.mockResolvedValue({ data: [sentInvitation], total: 1 })

      render(<Groups />, { wrapper: createWrapper() })

      expect(await screen.findByText('pending@test.com')).toBeInTheDocument()
      expect(screen.getByLabelText('Cancel invitation to pending@test.com')).toBeInTheDocument()
    })

    it('should call cancelInvitation when cancel is clicked', async () => {
      const user = userEvent.setup()
      mockListGroups.mockResolvedValue(ownedGroup)
      mockListGroupInvitations.mockResolvedValue({ data: [sentInvitation], total: 1 })
      mockCancelInvitation.mockResolvedValue({ message: 'cancelled' })

      render(<Groups />, { wrapper: createWrapper() })
      await screen.findByText('pending@test.com')
      await user.click(screen.getByLabelText('Cancel invitation to pending@test.com'))

      expect(mockCancelInvitation).toHaveBeenCalledWith('g1', 'sent-1')
    })
  })

  describe('invite member', () => {
    const ownedGroup = {
      data: [
        {
          id: 'g1',
          name: 'Smith Family',
          owner_id: 'user-1',
          member_count: 1,
          members: [{ id: 'user-1', username: 'testuser', email: 'test@test.com' }],
        },
      ],
      total: 1,
    }

    it('should call inviteMember with the typed email', async () => {
      const user = userEvent.setup()
      mockListGroups.mockResolvedValue(ownedGroup)
      mockInviteMember.mockResolvedValue({ message: 'invited' })

      render(<Groups />, { wrapper: createWrapper() })
      await screen.findByText('Smith Family')

      const emailInput = screen.getByPlaceholderText('name@example.com')
      await user.type(emailInput, 'friend@test.com')
      await user.click(screen.getByRole('button', { name: 'Send' }))

      expect(mockInviteMember).toHaveBeenCalledWith('g1', { email: 'friend@test.com' })
    })
  })

  describe('remove member', () => {
    const ownedGroup = {
      data: [
        {
          id: 'g1',
          name: 'Smith Family',
          owner_id: 'user-1',
          member_count: 2,
          members: [
            { id: 'user-1', username: 'testuser', email: 'test@test.com' },
            { id: 'user-3', username: 'Alice', email: 'alice@test.com' },
          ],
        },
      ],
      total: 1,
    }

    it('should call removeMember for non-owner members', async () => {
      const user = userEvent.setup()
      mockListGroups.mockResolvedValue(ownedGroup)
      mockRemoveMember.mockResolvedValue({ message: 'removed' })

      render(<Groups />, { wrapper: createWrapper() })
      await screen.findByText('Alice')
      await user.click(screen.getByLabelText('Remove Alice'))

      expect(mockRemoveMember).toHaveBeenCalledWith('g1', 'user-3')
    })
  })

  describe('leave group', () => {
    it('should call leaveGroup when confirmed', async () => {
      const user = userEvent.setup()
      mockListGroups.mockResolvedValue({
        data: [
          { id: 'g2', name: 'Cooking Club', owner_id: 'user-2', member_count: 5, members: [] },
        ],
        total: 1,
      })
      mockLeaveGroup.mockResolvedValue({ message: 'left' })

      render(<Groups />, { wrapper: createWrapper() })
      await screen.findByText('Cooking Club')
      await user.click(screen.getByText('Leave Group'))
      await user.click(await screen.findByRole('button', { name: 'Leave' }))

      expect(mockLeaveGroup).toHaveBeenCalledWith('g2')
    })
  })

  describe('delete group', () => {
    it('should call deleteGroup when confirmed', async () => {
      const user = userEvent.setup()
      mockListGroups.mockResolvedValue({
        data: [
          {
            id: 'g1',
            name: 'Smith Family',
            owner_id: 'user-1',
            member_count: 1,
            members: [{ id: 'user-1', username: 'testuser', email: 'test@test.com' }],
          },
        ],
        total: 1,
      })
      mockDeleteGroup.mockResolvedValue({ message: 'deleted' })

      render(<Groups />, { wrapper: createWrapper() })
      await screen.findByText('Smith Family')
      await user.click(screen.getByText('Delete Group'))
      await user.click(await screen.findByRole('button', { name: 'Delete' }))

      expect(mockDeleteGroup).toHaveBeenCalledWith('g1')
    })
  })

  describe('rename group', () => {
    const ownedGroup = {
      data: [
        {
          id: 'g1',
          name: 'Old Name',
          owner_id: 'user-1',
          member_count: 1,
          members: [{ id: 'user-1', username: 'testuser', email: 'test@test.com' }],
        },
      ],
      total: 1,
    }

    const nonOwnedGroup = {
      data: [
        {
          id: 'g2',
          name: 'Other Group',
          owner_id: 'user-2',
          member_count: 1,
          members: [],
        },
      ],
      total: 1,
    }

    it('should show edit icon for owned groups', async () => {
      mockListGroups.mockResolvedValue(ownedGroup)
      render(<Groups />, { wrapper: createWrapper() })

      await screen.findByText('Old Name')
      expect(screen.getByLabelText('Rename group')).toBeInTheDocument()
    })

    it('should not show edit icon for non-owned groups', async () => {
      mockListGroups.mockResolvedValue(nonOwnedGroup)
      render(<Groups />, { wrapper: createWrapper() })

      await screen.findByText('Other Group')
      expect(screen.queryByLabelText('Rename group')).not.toBeInTheDocument()
    })

    it('should show input with current name when edit is clicked', async () => {
      const user = userEvent.setup()
      mockListGroups.mockResolvedValue(ownedGroup)
      render(<Groups />, { wrapper: createWrapper() })

      await screen.findByText('Old Name')
      await user.click(screen.getByLabelText('Rename group'))

      const input = screen.getByDisplayValue('Old Name')
      expect(input).toBeInTheDocument()
      expect(input).toHaveFocus()
    })

    it('should call updateGroup on blur with new name', async () => {
      const user = userEvent.setup()
      mockListGroups.mockResolvedValue(ownedGroup)
      mockUpdateGroup.mockResolvedValue({ ...ownedGroup.data[0], name: 'New Name' })
      render(<Groups />, { wrapper: createWrapper() })

      await screen.findByText('Old Name')
      await user.click(screen.getByLabelText('Rename group'))

      const input = screen.getByDisplayValue('Old Name')
      await user.clear(input)
      await user.type(input, 'New Name')
      await user.tab()

      expect(mockUpdateGroup).toHaveBeenCalledWith('g1', { name: 'New Name' })
    })

    it('should cancel editing on Escape without calling API', async () => {
      const user = userEvent.setup()
      mockListGroups.mockResolvedValue(ownedGroup)
      render(<Groups />, { wrapper: createWrapper() })

      await screen.findByText('Old Name')
      await user.click(screen.getByLabelText('Rename group'))

      const input = screen.getByDisplayValue('Old Name')
      await user.clear(input)
      await user.type(input, 'Will be cancelled')
      await user.keyboard('{Escape}')

      expect(mockUpdateGroup).not.toHaveBeenCalled()
      expect(screen.getByText('Old Name')).toBeInTheDocument()
    })

    it('should not call API when name is unchanged', async () => {
      const user = userEvent.setup()
      mockListGroups.mockResolvedValue(ownedGroup)
      render(<Groups />, { wrapper: createWrapper() })

      await screen.findByText('Old Name')
      await user.click(screen.getByLabelText('Rename group'))
      await user.tab()

      expect(mockUpdateGroup).not.toHaveBeenCalled()
    })
  })

  describe('create group', () => {
    it('should call createGroup from the header New group dialog', async () => {
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

      // Open the create dialog from the header button.
      await user.click(screen.getByRole('button', { name: /New group/ }))

      const nameInput = await screen.findByPlaceholderText('Smith Family')
      const submitButton = screen
        .getAllByRole('button', { name: 'Create Group' })
        .find((el) => el.getAttribute('type') === 'submit')!

      await user.type(nameInput, 'New Group')
      await user.click(submitButton)

      expect(mockCreateGroup).toHaveBeenCalledWith({ name: 'New Group' })
    })
  })
})
