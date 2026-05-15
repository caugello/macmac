import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authApi } from '@/api/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuth } from '@/contexts/AuthContext'
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
      <div className="container mx-auto px-4 py-8">
        <p>Loading groups...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Groups</h1>
          <p className="text-muted-foreground">
            Manage your family groups and share recipes & meal plans
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#00CEB8] hover:bg-[#00b8a5] text-black">Create Group</Button>
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
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button type="submit" className="w-full" disabled={createGroupMutation.isPending}>
                {createGroupMutation.isPending ? 'Creating...' : 'Create Group'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error && !isCreateDialogOpen && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {groupsData?.data.map((group) => (
          <Card key={group.id}>
            <CardHeader>
              <CardTitle>{group.name}</CardTitle>
              <CardDescription>
                {group.member_count} {group.member_count === 1 ? 'member' : 'members'}
                {group.owner_id === user?.id && ' • You are the owner'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {group.owner_id === user?.id && (
                <div className="space-y-4">
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
                    >
                      Add
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {groupsData?.data.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">You don&apos;t belong to any groups yet</p>
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              className="bg-[#00CEB8] hover:bg-[#00b8a5] text-black"
            >
              Create Your First Group
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
