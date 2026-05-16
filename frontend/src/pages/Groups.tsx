import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authApi } from '@/api/auth'
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

export const Groups: React.FC = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [newMemberUsername, setNewMemberUsername] = useState('')
  const [error, setError] = useState<string | null>(null)

  const { data: groupsData, isLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: () => authApi.listGroups(),
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

  const addMemberMutation = useMutation({
    mutationFn: ({ groupId, username }: { groupId: string; username: string }) =>
      authApi.addMember(groupId, { username }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      setNewMemberUsername('')
      setError(null)
    },
    onError: (err) => {
      const detail = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
      setError(detail || 'Failed to add member')
    },
  })

  // @ts-expect-error mutation wired but UI not yet connected
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const removeMemberMutation = useMutation({
    mutationFn: ({ groupId, userId }: { groupId: string; userId: string }) =>
      authApi.removeMember(groupId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      setError(null)
    },
    onError: (err) => {
      const detail = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
      setError(detail || 'Failed to remove member')
    },
  })

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault()
    if (newGroupName.trim()) {
      createGroupMutation.mutate(newGroupName.trim())
    }
  }

  const handleAddMember = (groupId: string) => {
    if (newMemberUsername.trim()) {
      addMemberMutation.mutate({ groupId, username: newMemberUsername.trim() })
    }
  }

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

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Main area */}
        <div className="md:col-span-8">
          {groupsData?.data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center dashed-outline rounded-lg bg-surface-container-lowest">
              <div className="w-24 h-24 rounded-full bg-surface-variant flex items-center justify-center mb-6 opacity-40">
                <Icon name="group_off" size={48} />
              </div>
              <p className="text-headline-md font-heading mb-2">No groups yet</p>
              <p className="text-body-md text-on-surface-variant mb-6">
                You don&apos;t belong to any groups yet
              </p>
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                className="bg-primary text-on-primary rounded-full px-6"
              >
                Create Your First Group
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

                    {group.owner_id === user?.id && (
                      <div className="dashed-outline rounded-lg p-4 mt-4">
                        <p className="text-label-sm text-on-surface-variant mb-2">Add a member</p>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Username to add"
                            value={selectedGroupId === group.id ? newMemberUsername : ''}
                            onChange={(e) => {
                              setSelectedGroupId(group.id)
                              setNewMemberUsername(e.target.value)
                            }}
                            onFocus={() => setSelectedGroupId(group.id)}
                          />
                          <Button
                            onClick={() => handleAddMember(group.id)}
                            disabled={
                              addMemberMutation.isPending ||
                              !newMemberUsername.trim() ||
                              selectedGroupId !== group.id
                            }
                            size="sm"
                            className="px-4"
                          >
                            Add
                          </Button>
                        </div>
                      </div>
                    )}
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
