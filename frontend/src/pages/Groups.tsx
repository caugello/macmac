import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authApi, Invitation, GroupMember, Group } from '@/api/auth'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'
import { Icon } from '@/components/ui/icon'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
    <div className="mt-5 space-y-2">
      <p className="text-caption uppercase tracking-wider text-on-surface-variant">
        Pending invitations
      </p>
      {error && <div className="p-3 rounded-bento bg-coral text-white text-sm">{error}</div>}
      <div className="space-y-1.5">
        {invitations.map((inv: Invitation) => (
          <div
            key={inv.id}
            className="flex items-center justify-between gap-2 py-2 px-3 rounded-bento bg-yellow/30"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-yellow flex items-center justify-center flex-shrink-0">
                <Icon name="schedule_send" size={16} className="text-ink" />
              </div>
              <p className="text-body-md text-ink/80 truncate">{inv.email}</p>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => cancelMutation.mutate(inv.id)}
              disabled={cancelMutation.isPending}
              className="text-on-surface-variant hover:text-coral flex-shrink-0"
              aria-label={`Cancel invitation to ${inv.email}`}
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
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState('')

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
    onSuccess: (data) => {
      if (data.access_token) {
        localStorage.setItem('auth_token', data.access_token)
      }
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

  const updateGroupMutation = useMutation({
    mutationFn: ({ groupId, name }: { groupId: string; name: string }) =>
      authApi.updateGroup(groupId, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      setEditingGroupId(null)
      setError(null)
    },
    onError: (err) => {
      const detail = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
      setError(detail || 'Failed to rename group')
      setEditingGroupId(null)
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
        <div className="h-8 w-32 rounded-full skeleton-shimmer mb-6" />
        <div className="space-y-4">
          {[1, 2].map((n) => (
            <div key={n} className="h-32 rounded-bento skeleton-shimmer" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-12 pt-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-headline-lg font-display font-bold text-ink">Groups</h1>
          <p className="text-on-surface-variant text-body-md max-w-lg">
            Manage your family groups and share recipes &amp; meal plans
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="accent" className="md:hidden">
              <Icon name="group_add" size={20} className="mr-2" />
              Create Group
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-display">Create New Group</DialogTitle>
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
                <div className="p-3 rounded-bento bg-coral text-white text-sm">{error}</div>
              )}
              <Button type="submit" className="w-full" disabled={createGroupMutation.isPending}>
                {createGroupMutation.isPending ? 'Creating...' : 'Create Group'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error && !isCreateDialogOpen && (
        <div className="p-3 rounded-bento bg-coral text-white text-sm mb-4">{error}</div>
      )}

      {/* Pending invitations */}
      {pendingInvitations.length > 0 && (
        <div className="mb-8">
          <h2 className="text-headline-md font-display font-semibold text-ink mb-4">
            Pending Invitations
          </h2>
          <div className="space-y-3">
            {pendingInvitations.map((invitation: Invitation) => (
              <Card
                key={invitation.id}
                tone="soft-purple"
                className="p-4 flex flex-col sm:flex-row sm:items-center gap-4"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-11 h-11 rounded-full bg-white/60 flex items-center justify-center flex-shrink-0">
                    <Icon name="mail" size={20} className="text-ink" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-body-md font-semibold text-ink truncate">
                      {invitation.group_name}
                    </p>
                    <p className="text-body-sm text-ink/70">Invited by {invitation.inviter_name}</p>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button
                    size="sm"
                    variant="accent"
                    onClick={() =>
                      respondMutation.mutate({
                        invitationId: invitation.id,
                        action: 'accept',
                      })
                    }
                    disabled={respondMutation.isPending}
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
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Main area */}
        <div className="md:col-span-8">
          {groupsData?.data.length === 0 && pendingInvitations.length === 0 ? (
            <Card
              tone="lime"
              className="flex flex-col items-center justify-center py-12 px-6 text-center"
            >
              <div className="w-20 h-20 rounded-full bg-ink/10 flex items-center justify-center mb-5">
                <Icon name="group" size={36} className="text-ink" />
              </div>
              <p className="text-headline-md font-display font-semibold text-ink mb-1.5">
                Better together
              </p>
              <p className="text-body-md text-ink/80 mb-6 max-w-xs">
                Create a group to share recipes and meal plans with family or friends.
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>Create a group</Button>
            </Card>
          ) : (
            <div className="space-y-6">
              {groupsData?.data.map((group) => (
                <Card key={group.id} tone="white" className="overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-start gap-4 mb-3">
                      <div className="w-12 h-12 rounded-bento bg-lime flex items-center justify-center flex-shrink-0">
                        <Icon name="family_history" size={24} className="text-ink" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {editingGroupId === group.id ? (
                            <Input
                              autoFocus
                              value={editDraft}
                              onChange={(e) => setEditDraft(e.target.value)}
                              onBlur={() => {
                                const trimmed = editDraft.trim()
                                if (trimmed && trimmed !== group.name) {
                                  updateGroupMutation.mutate({ groupId: group.id, name: trimmed })
                                } else {
                                  setEditingGroupId(null)
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  ;(e.target as HTMLInputElement).blur()
                                } else if (e.key === 'Escape') {
                                  e.preventDefault()
                                  setEditingGroupId(null)
                                }
                              }}
                              className="text-headline-md font-display h-auto py-1 px-2"
                              maxLength={100}
                            />
                          ) : (
                            <>
                              <h2 className="text-headline-md font-display text-ink">
                                {group.name}
                              </h2>
                              {group.owner_id === user?.id && (
                                <button
                                  onClick={() => {
                                    setEditDraft(group.name)
                                    setEditingGroupId(group.id)
                                  }}
                                  className="p-2 -m-1 text-on-surface-variant hover:text-ink transition-colors"
                                  aria-label="Rename group"
                                >
                                  <Icon name="edit" size={18} />
                                </button>
                              )}
                            </>
                          )}
                          {group.owner_id === user?.id && editingGroupId !== group.id && (
                            <Badge
                              variant="accent"
                              className="uppercase tracking-wider text-[10px]"
                            >
                              Owner
                            </Badge>
                          )}
                        </div>
                        <p className="text-body-md text-on-surface-variant mt-1">
                          {group.member_count} {group.member_count === 1 ? 'member' : 'members'}
                          {group.owner_id === user?.id && ' · You are the owner'}
                        </p>
                      </div>
                    </div>

                    {group.members.length > 0 && (
                      <div className="mt-5 space-y-2">
                        <p className="text-caption uppercase tracking-wider text-on-surface-variant">
                          Members
                        </p>
                        <div className="space-y-1.5">
                          {group.members.map((member: GroupMember) => (
                            <div
                              key={member.id}
                              className="flex items-center justify-between gap-2 py-2 px-3 rounded-bento bg-cream"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-9 h-9 rounded-full bg-ink flex items-center justify-center flex-shrink-0">
                                  <span className="text-cream text-caption font-bold">
                                    {member.username.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div className="min-w-0">
                                  <p className="text-body-md text-ink truncate">
                                    {member.username}
                                  </p>
                                  <p className="text-body-sm text-on-surface-variant truncate">
                                    {member.email}
                                  </p>
                                </div>
                              </div>
                              {group.owner_id === user?.id && member.id !== user?.id && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() =>
                                    removeMemberMutation.mutate({
                                      groupId: group.id,
                                      userId: member.id,
                                    })
                                  }
                                  disabled={removeMemberMutation.isPending}
                                  className="text-on-surface-variant hover:text-coral flex-shrink-0"
                                  aria-label={`Remove ${member.username}`}
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
                      <div className="rounded-bento bg-cream p-4 mt-5">
                        <p className="text-caption uppercase tracking-wider text-on-surface-variant mb-2">
                          Invite by email
                        </p>
                        <div className="flex flex-col sm:flex-row gap-2">
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
                            className="px-6 flex-shrink-0"
                          >
                            Invite
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="mt-5 pt-5 border-t border-border flex justify-end">
                      {group.owner_id === user?.id ? (
                        <Dialog
                          open={confirmDeleteGroupId === group.id}
                          onOpenChange={(open) => setConfirmDeleteGroupId(open ? group.id : null)}
                        >
                          <DialogTrigger asChild>
                            <Button size="sm" variant="destructive">
                              <Icon name="delete" size={16} className="mr-1" />
                              Delete Group
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle className="font-display">
                                Delete &ldquo;{group.name}&rdquo;?
                              </DialogTitle>
                              <DialogDescription>
                                This will permanently delete the group and remove all members. This
                                action cannot be undone.
                              </DialogDescription>
                            </DialogHeader>
                            <DialogFooter className="gap-3 mt-4">
                              <Button
                                variant="outline"
                                onClick={() => setConfirmDeleteGroupId(null)}
                              >
                                Cancel
                              </Button>
                              <Button
                                variant="destructive"
                                onClick={() => deleteGroupMutation.mutate(group.id)}
                                disabled={deleteGroupMutation.isPending}
                              >
                                {deleteGroupMutation.isPending ? 'Deleting...' : 'Delete'}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      ) : (
                        <Dialog
                          open={confirmLeaveGroupId === group.id}
                          onOpenChange={(open) => setConfirmLeaveGroupId(open ? group.id : null)}
                        >
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline">
                              <Icon name="logout" size={16} className="mr-1" />
                              Leave Group
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle className="font-display">
                                Leave &ldquo;{group.name}&rdquo;?
                              </DialogTitle>
                              <DialogDescription>
                                You will no longer have access to this group&apos;s shared recipes
                                and meal plans. You can rejoin if invited again.
                              </DialogDescription>
                            </DialogHeader>
                            <DialogFooter className="gap-3 mt-4">
                              <Button
                                variant="outline"
                                onClick={() => setConfirmLeaveGroupId(null)}
                              >
                                Cancel
                              </Button>
                              <Button
                                variant="destructive"
                                onClick={() => leaveGroupMutation.mutate(group.id)}
                                disabled={leaveGroupMutation.isPending}
                              >
                                {leaveGroupMutation.isPending ? 'Leaving...' : 'Leave'}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar - desktop only */}
        <div className="hidden md:block md:col-span-4">
          <Card tone="ink" className="sticky top-24 p-6">
            <h2 className="text-headline-md font-display font-semibold mb-2">Create Group</h2>
            <p className="text-body-md text-cream/70 mb-6">
              Create a group to share recipes and meal plans with family or friends
            </p>
            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sidebar-group-name" className="text-cream">
                  Group Name
                </Label>
                <Input
                  id="sidebar-group-name"
                  placeholder="Smith Family"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  required
                  className="bg-white text-ink"
                />
              </div>
              {error && (
                <div className="p-3 rounded-bento bg-coral text-white text-sm">{error}</div>
              )}
              <Button
                type="submit"
                variant="accent"
                className="w-full"
                disabled={createGroupMutation.isPending}
              >
                {createGroupMutation.isPending ? 'Creating...' : 'Create Group'}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  )
}
