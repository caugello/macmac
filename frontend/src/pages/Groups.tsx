import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authApi, Invitation, GroupMember, Group } from '@/api/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'
import { Icon } from '@/components/ui/icon'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

const SentInvitations: React.FC<{ group: Group }> = ({ group }) => {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  const { data: sentData } = useQuery({
    queryKey: ['group-invitations', group.id],
    queryFn: () => authApi.listGroupInvitations(group.id),
  })

  const cancelMutation = useMutation({
    mutationFn: (invitationId: string) => authApi.cancelInvitation(group.id, invitationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-invitations', group.id] })
      setError(null)
    },
    onError: (err) => {
      const detail = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
      setError(detail || 'Failed to cancel invitation')
    },
  })

  const invitations = sentData?.data ?? []
  if (invitations.length === 0) return null

  return (
    <div className="mt-4 space-y-2">
      <p className="text-label-sm text-on-surface-variant">Pending invitations</p>
      {error && (
        <div className="p-2 rounded-lg bg-error-container text-on-error-container text-sm">
          {error}
        </div>
      )}
      <div className="space-y-1">
        {invitations.map((inv: Invitation) => (
          <div
            key={inv.id}
            className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-surface-container-low"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full bg-tertiary-container flex items-center justify-center flex-shrink-0">
                <Icon name="schedule_send" size={16} className="text-on-tertiary-container" />
              </div>
              <p className="text-body-md text-on-surface-variant truncate">{inv.email}</p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => cancelMutation.mutate(inv.id)}
              disabled={cancelMutation.isPending}
              className="text-on-surface-variant hover:text-error flex-shrink-0"
            >
              <Icon name="close" size={18} />
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}

export const Groups: React.FC = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [confirmLeaveGroupId, setConfirmLeaveGroupId] = useState<string | null>(null)
  const [confirmDeleteGroupId, setConfirmDeleteGroupId] = useState<string | null>(null)

  const { data: groupsData, isLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: () => authApi.listGroups(),
  })

  const { data: invitationsData } = useQuery({
    queryKey: ['invitations'],
    queryFn: () => authApi.listInvitations(),
  })

  const createGroupMutation = useMutation({
    mutationFn: (name: string) => authApi.createGroup({ name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      setIsCreateDialogOpen(false)
      setNewGroupName('')
      setError(null)
    },
    onError: (err) => {
      const detail = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
      setError(detail || 'Failed to create group')
    },
  })

  const inviteMemberMutation = useMutation({
    mutationFn: ({ groupId, email }: { groupId: string; email: string }) =>
      authApi.inviteMember(groupId, { email }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      queryClient.invalidateQueries({ queryKey: ['group-invitations', variables.groupId] })
      setInviteEmail('')
      setError(null)
    },
    onError: (err) => {
      const detail = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
      setError(detail || 'Failed to send invitation')
    },
  })

  const respondMutation = useMutation({
    mutationFn: ({
      invitationId,
      action,
    }: {
      invitationId: string
      action: 'accept' | 'decline'
    }) => authApi.respondToInvitation(invitationId, { action }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] })
      queryClient.invalidateQueries({ queryKey: ['groups'] })
    },
    onError: (err) => {
      const detail = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
      setError(detail || 'Failed to respond to invitation')
    },
  })

  const removeMemberMutation = useMutation({
    mutationFn: ({ groupId, userId }: { groupId: string; userId: string }) =>
      authApi.removeMember(groupId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
    },
    onError: (err) => {
      const detail = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
      setError(detail || 'Failed to remove member')
    },
  })

  const leaveGroupMutation = useMutation({
    mutationFn: (groupId: string) => authApi.leaveGroup(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      setConfirmLeaveGroupId(null)
    },
    onError: (err) => {
      const detail = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
      setError(detail || 'Failed to leave group')
      setConfirmLeaveGroupId(null)
    },
  })

  const deleteGroupMutation = useMutation({
    mutationFn: (groupId: string) => authApi.deleteGroup(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      setConfirmDeleteGroupId(null)
    },
    onError: (err) => {
      const detail = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
      setError(detail || 'Failed to delete group')
      setConfirmDeleteGroupId(null)
    },
  })

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault()
    if (newGroupName.trim()) {
      createGroupMutation.mutate(newGroupName.trim())
    }
  }

  const handleInviteMember = (groupId: string) => {
    if (inviteEmail.trim()) {
      inviteMemberMutation.mutate({ groupId, email: inviteEmail.trim() })
    }
  }

  const pendingInvitations = invitationsData?.data ?? []

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-12 pt-6 pb-12">
        <div className="h-8 w-32 rounded skeleton-shimmer mb-6" />
        <div className="space-y-4">
          {[1, 2].map((n) => (
            <div key={n} className="h-32 rounded-lg skeleton-shimmer" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-12 pt-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-headline-xl font-heading font-bold">Groups</h1>
          <p className="text-on-surface-variant text-body-md max-w-lg">
            Manage your family groups and share recipes &amp; meal plans
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <button className="md:hidden bg-primary text-on-primary px-6 py-3 rounded-lg font-label-md flex items-center gap-2 shadow-sm">
              <Icon name="group_add" size={20} />
              Create Group
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Group</DialogTitle>
              <DialogDescription>
                Create a group to share recipes and meal plans with family or friends
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="group-name">Group Name</Label>
                <Input
                  id="group-name"
                  placeholder="Smith Family"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  required
                />
              </div>
              {error && (
                <div className="p-3 rounded-lg bg-error-container text-on-error-container text-sm">
                  {error}
                </div>
              )}
              <Button
                type="submit"
                className="w-full py-4 rounded-lg"
                disabled={createGroupMutation.isPending}
              >
                {createGroupMutation.isPending ? 'Creating...' : 'Create Group'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error && !isCreateDialogOpen && (
        <div className="p-3 rounded-lg bg-error-container text-on-error-container text-sm mb-4">
          {error}
        </div>
      )}

      {/* Pending invitations */}
      {pendingInvitations.length > 0 && (
        <div className="mb-8">
          <h2 className="text-headline-md font-heading font-semibold mb-4">Pending Invitations</h2>
          <div className="space-y-3">
            {pendingInvitations.map((invitation: Invitation) => (
              <div
                key={invitation.id}
                className="bg-tertiary-container/30 wireframe-border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-4"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-tertiary-container flex items-center justify-center flex-shrink-0">
                    <Icon name="mail" size={20} className="text-on-tertiary-container" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-body-md font-medium truncate">{invitation.group_name}</p>
                    <p className="text-body-sm text-on-surface-variant">
                      Invited by {invitation.inviter_name}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button
                    size="sm"
                    onClick={() =>
                      respondMutation.mutate({
                        invitationId: invitation.id,
                        action: 'accept',
                      })
                    }
                    disabled={respondMutation.isPending}
                    className="bg-primary text-on-primary"
                  >
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      respondMutation.mutate({
                        invitationId: invitation.id,
                        action: 'decline',
                      })
                    }
                    disabled={respondMutation.isPending}
                  >
                    Decline
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Main area */}
        <div className="md:col-span-8">
          {groupsData?.data.length === 0 && pendingInvitations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center rounded-2xl bg-gradient-to-br from-primary/5 to-transparent border border-outline-variant/50">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-5">
                <Icon name="group" size={36} className="text-primary" />
              </div>
              <p className="text-headline-md font-heading font-semibold mb-1.5">Better together</p>
              <p className="text-body-md text-on-surface-variant mb-6 max-w-xs">
                Create a group to share recipes and meal plans with family or friends.
              </p>
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                className="bg-primary text-on-primary rounded-full px-6"
              >
                Create a group
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {groupsData?.data.map((group) => (
                <div
                  key={group.id}
                  className="bg-surface-container-lowest wireframe-border rounded-lg overflow-hidden card-hover-shadow"
                >
                  <div className="p-6">
                    <div className="flex items-start gap-4 mb-3">
                      <div className="w-12 h-12 rounded-full bg-secondary-container flex items-center justify-center flex-shrink-0">
                        <Icon
                          name="family_history"
                          size={24}
                          className="text-on-secondary-container"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-headline-md font-heading">{group.name}</h2>
                          {group.owner_id === user?.id && (
                            <span className="bg-tertiary-container text-on-tertiary-container text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold">
                              Owner
                            </span>
                          )}
                        </div>
                        <p className="text-body-md text-on-surface-variant mt-1">
                          {group.member_count} {group.member_count === 1 ? 'member' : 'members'}
                          {group.owner_id === user?.id && ' · You are the owner'}
                        </p>
                      </div>
                    </div>

                    {group.members.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <p className="text-label-sm text-on-surface-variant">Members</p>
                        <div className="space-y-1">
                          {group.members.map((member: GroupMember) => (
                            <div
                              key={member.id}
                              className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-surface-container-low"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center flex-shrink-0">
                                  <span className="text-on-primary-container text-label-sm font-bold">
                                    {member.username.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div className="min-w-0">
                                  <p className="text-body-md truncate">{member.username}</p>
                                  <p className="text-body-sm text-on-surface-variant truncate">
                                    {member.email}
                                  </p>
                                </div>
                              </div>
                              {group.owner_id === user?.id && member.id !== user?.id && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() =>
                                    removeMemberMutation.mutate({
                                      groupId: group.id,
                                      userId: member.id,
                                    })
                                  }
                                  disabled={removeMemberMutation.isPending}
                                  className="text-on-surface-variant hover:text-error flex-shrink-0"
                                >
                                  <Icon name="person_remove" size={18} />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {group.owner_id === user?.id && <SentInvitations group={group} />}

                    {group.owner_id === user?.id && (
                      <div className="dashed-outline rounded-lg p-4 mt-4">
                        <p className="text-label-sm text-on-surface-variant mb-2">
                          Invite by email
                        </p>
                        <div className="flex gap-2">
                          <Input
                            type="email"
                            placeholder="name@example.com"
                            value={selectedGroupId === group.id ? inviteEmail : ''}
                            onChange={(e) => {
                              setSelectedGroupId(group.id)
                              setInviteEmail(e.target.value)
                            }}
                            onFocus={() => setSelectedGroupId(group.id)}
                          />
                          <Button
                            onClick={() => handleInviteMember(group.id)}
                            disabled={
                              inviteMemberMutation.isPending ||
                              !inviteEmail.trim() ||
                              selectedGroupId !== group.id
                            }
                            size="sm"
                            className="px-4"
                          >
                            Invite
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="mt-4 pt-4 border-t border-outline-variant flex justify-end">
                      {group.owner_id === user?.id ? (
                        <Dialog
                          open={confirmDeleteGroupId === group.id}
                          onOpenChange={(open) => setConfirmDeleteGroupId(open ? group.id : null)}
                        >
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-error border-error/30 hover:bg-error-container"
                            >
                              <Icon name="delete" size={16} className="mr-1" />
                              Delete Group
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Delete &ldquo;{group.name}&rdquo;?</DialogTitle>
                              <DialogDescription>
                                This will permanently delete the group and remove all members. This
                                action cannot be undone.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="flex gap-3 justify-end mt-4">
                              <Button
                                variant="outline"
                                onClick={() => setConfirmDeleteGroupId(null)}
                              >
                                Cancel
                              </Button>
                              <Button
                                className="bg-error text-on-error hover:bg-error/90"
                                onClick={() => deleteGroupMutation.mutate(group.id)}
                                disabled={deleteGroupMutation.isPending}
                              >
                                {deleteGroupMutation.isPending ? 'Deleting...' : 'Delete'}
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      ) : (
                        <Dialog
                          open={confirmLeaveGroupId === group.id}
                          onOpenChange={(open) => setConfirmLeaveGroupId(open ? group.id : null)}
                        >
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" className="text-on-surface-variant">
                              <Icon name="logout" size={16} className="mr-1" />
                              Leave Group
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Leave &ldquo;{group.name}&rdquo;?</DialogTitle>
                              <DialogDescription>
                                You will no longer have access to this group&apos;s shared recipes
                                and meal plans. You can rejoin if invited again.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="flex gap-3 justify-end mt-4">
                              <Button
                                variant="outline"
                                onClick={() => setConfirmLeaveGroupId(null)}
                              >
                                Cancel
                              </Button>
                              <Button
                                className="bg-error text-on-error hover:bg-error/90"
                                onClick={() => leaveGroupMutation.mutate(group.id)}
                                disabled={leaveGroupMutation.isPending}
                              >
                                {leaveGroupMutation.isPending ? 'Leaving...' : 'Leave'}
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar - desktop only */}
        <div className="hidden md:block md:col-span-4">
          <div className="sticky top-24 bg-surface-container-lowest wireframe-border rounded-lg p-6">
            <h2 className="text-headline-md font-heading font-semibold mb-2">Create Group</h2>
            <p className="text-body-md text-on-surface-variant mb-6">
              Create a group to share recipes and meal plans with family or friends
            </p>
            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sidebar-group-name">Group Name</Label>
                <Input
                  id="sidebar-group-name"
                  placeholder="Smith Family"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  required
                />
              </div>
              {error && (
                <div className="p-3 rounded-lg bg-error-container text-on-error-container text-sm">
                  {error}
                </div>
              )}
              <Button
                type="submit"
                className="w-full py-4 rounded-lg"
                disabled={createGroupMutation.isPending}
              >
                {createGroupMutation.isPending ? 'Creating...' : 'Create Group'}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
