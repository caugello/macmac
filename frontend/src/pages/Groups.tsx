import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authApi, Invitation, GroupMember, Group } from '@/api/auth'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'
import { Icon } from '@/components/ui/icon'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

/**
 * Deterministic per-entity avatar colors drawn from the Pantry Fresh palette
 * (design section 12). Each entry pairs a background with a readable initial
 * color. `#6B4BE6` is the design's avatar purple (already used in Dashboard);
 * the rest are existing brand tokens.
 */
const AVATAR_PALETTE = [
  { bg: 'var(--lime)', text: 'var(--ink)' },
  { bg: 'var(--green)', text: 'var(--ink)' },
  { bg: 'var(--coral)', text: '#ffffff' },
  { bg: 'var(--yellow)', text: 'var(--ink)' },
  { bg: '#6B4BE6', text: '#ffffff' },
] as const

const avatarColor = (name: string) => {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length]
}

const initial = (name: string) => name.charAt(0).toUpperCase()

/** Colored rounded-square tile showing a group's initial letter. */
const GroupAvatar: React.FC<{ name: string; isOwner: boolean; className?: string }> = ({
  name,
  isOwner,
  className,
}) => {
  // Owner groups use lime (design); non-owned groups get a deterministic color.
  const color = isOwner ? AVATAR_PALETTE[0] : avatarColor(name)
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-[14px] font-display font-extrabold flex-shrink-0',
        className
      )}
      style={{ backgroundColor: color.bg, color: color.text }}
      aria-hidden="true"
    >
      {initial(name)}
    </div>
  )
}

/** Colored circle showing a member's initial letter. */
const MemberAvatar: React.FC<{ name: string; className?: string }> = ({ name, className }) => {
  const color = avatarColor(name)
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full font-display font-bold flex-shrink-0',
        className
      )}
      style={{ backgroundColor: color.bg, color: color.text }}
      aria-hidden="true"
    >
      {initial(name)}
    </div>
  )
}

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
      <p className="text-caption uppercase tracking-wider text-on-surface-variant">
        Pending invitations
      </p>
      {error && <div className="p-3 rounded-bento bg-coral text-white text-sm">{error}</div>}
      <div className="space-y-1.5">
        {invitations.map((inv: Invitation) => (
          <div
            key={inv.id}
            className="flex items-center justify-between gap-2 py-2 px-3 rounded-bento bg-cream"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-9 h-9 rounded-full bg-cream border-[1.5px] border-dashed border-outline-variant flex items-center justify-center flex-shrink-0"
                aria-hidden="true"
              >
                <Icon name="mail" size={16} className="text-on-surface-variant" />
              </div>
              <div className="min-w-0">
                <p className="text-body-md text-ink/80 truncate">{inv.email}</p>
                <p className="text-body-sm font-semibold text-[#C26A00]">Invitation pending</p>
              </div>
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

  const groups = groupsData?.data ?? []
  const pendingInvitations = invitationsData?.data ?? []
  const isEmpty = groups.length === 0 && pendingInvitations.length === 0

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
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-headline-lg font-display font-bold text-ink">Groups</h1>
          <p className="text-on-surface-variant text-body-md max-w-lg">
            Shared with people you cook for
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-ink text-cream hover:bg-ink/90 min-h-[44px]">
              <Icon name="group_add" size={20} className="mr-2 text-lime" />
              New group
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

      {isEmpty ? (
        <Card
          tone="white"
          className="flex flex-col items-center justify-center py-14 px-6 text-center"
        >
          <div className="w-[88px] h-[88px] rounded-[28px] bg-lime flex items-center justify-center mb-5">
            <Icon name="groups" size={46} className="text-ink" />
          </div>
          <p className="text-headline-md font-display font-bold text-ink mb-2">No groups yet</p>
          <p className="text-body-md text-on-surface-variant mb-6 max-w-xs">
            Create a group to share recipes, meal plans and shopping lists with your household.
          </p>
          <Button
            className="bg-ink text-cream hover:bg-ink/90 min-h-[44px]"
            onClick={() => setIsCreateDialogOpen(true)}
          >
            <Icon name="group_add" size={19} className="mr-2 text-lime" />
            Create your first group
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Group cards */}
          <div className="lg:col-span-7 space-y-4">
            {groups.map((group) => {
              const isOwner = group.owner_id === user?.id
              return (
                <Card key={group.id} tone="white" className="overflow-hidden">
                  <div className="p-5">
                    <div className="flex items-start gap-3 mb-4">
                      <GroupAvatar
                        name={group.name}
                        isOwner={isOwner}
                        className="w-12 h-12 text-xl"
                      />
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
                              {isOwner ? (
                                <span className="bg-ink text-lime text-[9.5px] font-extrabold tracking-wider uppercase px-2 py-[3px] rounded-[9px]">
                                  Owner
                                </span>
                              ) : (
                                <span className="bg-cream text-on-surface-variant text-[9.5px] font-extrabold tracking-wider uppercase px-2 py-[3px] rounded-[9px]">
                                  Member
                                </span>
                              )}
                              {isOwner && (
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
                        </div>
                        <p className="text-body-sm text-on-surface-variant mt-1">
                          {group.member_count} {group.member_count === 1 ? 'member' : 'members'}
                        </p>
                      </div>
                    </div>

                    {group.members.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <p className="text-caption uppercase tracking-wider text-on-surface-variant">
                          Members
                        </p>
                        <div className="space-y-1.5">
                          {group.members.map((member: GroupMember) => {
                            const isYou = member.id === user?.id
                            const isGroupOwner = member.id === group.owner_id
                            return (
                              <div
                                key={member.id}
                                className="flex items-center justify-between gap-2 py-2 px-3 rounded-bento bg-cream"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <MemberAvatar
                                    name={member.username}
                                    className="w-9 h-9 text-caption"
                                  />
                                  <div className="min-w-0">
                                    <p className="text-body-md font-semibold text-ink truncate">
                                      {member.username}
                                      {isYou && (
                                        <span className="font-normal text-on-surface-variant">
                                          {' '}
                                          (you)
                                        </span>
                                      )}
                                    </p>
                                    <p className="text-body-sm text-on-surface-variant truncate">
                                      {member.email}
                                    </p>
                                  </div>
                                </div>
                                {isGroupOwner ? (
                                  <span className="text-body-sm font-bold text-[#5A8A0E] flex-shrink-0">
                                    Owner
                                  </span>
                                ) : (
                                  isOwner && (
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
                                      <Icon name="remove_circle_outline" size={18} />
                                    </Button>
                                  )
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {isOwner && <SentInvitations group={group} />}

                    {isOwner && (
                      <div className="rounded-bento bg-cream p-4 mt-4">
                        <p className="text-caption uppercase tracking-wider text-on-surface-variant mb-2 flex items-center gap-1.5">
                          <Icon name="person_add" size={16} className="text-on-surface-variant" />
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
                            variant="accent"
                            className="px-6 flex-shrink-0"
                          >
                            Send
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="mt-4 pt-4 border-t border-border flex justify-end">
                      {isOwner ? (
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
              )
            })}
          </div>

          {/* Invitations + Why groups */}
          <div className="lg:col-span-5 space-y-4">
            <Card tone="white" className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Icon name="mark_email_unread" size={20} className="text-coral" />
                <h2 className="text-title-lg font-display font-bold text-ink">Invitations</h2>
                {pendingInvitations.length > 0 && (
                  <span className="ml-auto bg-coral text-white text-[11px] font-extrabold min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center">
                    {pendingInvitations.length}
                  </span>
                )}
              </div>
              {pendingInvitations.length === 0 ? (
                <p className="text-body-sm text-on-surface-variant">
                  No pending invitations right now.
                </p>
              ) : (
                <div className="space-y-3">
                  {pendingInvitations.map((invitation: Invitation) => (
                    <div key={invitation.id} className="rounded-bento bg-cream p-3.5">
                      <div className="flex items-center gap-2.5 mb-3">
                        <GroupAvatar
                          name={invitation.group_name}
                          isOwner={false}
                          className="w-[38px] h-[38px] text-[15px]"
                        />
                        <div className="min-w-0">
                          <p className="text-body-md font-bold text-ink truncate">
                            {invitation.group_name}
                          </p>
                          <p className="text-body-sm text-on-surface-variant truncate">
                            from {invitation.inviter_name}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="accent"
                          className="flex-1"
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
                          className="flex-1"
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
              )}
            </Card>

            <Card tone="ink" className="p-5">
              <h2 className="text-title-lg font-display font-bold mb-2">Why groups?</h2>
              <p className="text-body-sm text-cream/70 leading-relaxed mb-4">
                Everyone in a group sees the same plan and shopping list. Whoever&apos;s at the
                store ticks items off in real time &mdash; no double-buying.
              </p>
              <Button
                variant="accent"
                className="w-full"
                onClick={() => setIsCreateDialogOpen(true)}
              >
                <Icon name="group_add" size={17} className="mr-2" />
                Create a group
              </Button>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
