import { apiClient } from './client'

export interface FirebaseLoginRequest {
  id_token: string
}

export interface User {
  id: string
  username: string
  email: string
  groups: string[]
  pending_invitations: number
}

export interface LoginResponse {
  access_token: string
  token_type: string
  user: User
}

export interface GroupCreate {
  name: string
}

export interface GroupUpdate {
  name: string
}

export interface GroupMember {
  id: string
  username: string
  email: string
}

export interface Group {
  id: string
  name: string
  owner_id: string | null
  member_count: number
  members: GroupMember[]
}

export interface GroupListResponse {
  total: number
  data: Group[]
}

export interface InviteMemberRequest {
  email: string
}

export interface Invitation {
  id: string
  group_id: string
  group_name: string
  email: string
  invited_by: string
  inviter_name: string
  status: string
  created_at: string
}

export interface InvitationListResponse {
  total: number
  data: Invitation[]
}

export interface InvitationActionRequest {
  action: 'accept' | 'decline'
}

export const authApi = {
  login: (data: FirebaseLoginRequest) =>
    apiClient.post<LoginResponse>('/auth/login', data).then((res) => res.data),

  me: () => apiClient.get<User>('/auth/me').then((res) => res.data),

  createGroup: (data: GroupCreate) =>
    apiClient.post<Group>('/auth/groups', data).then((res) => res.data),

  listGroups: () => apiClient.get<GroupListResponse>('/auth/groups').then((res) => res.data),

  updateGroup: (groupId: string, data: GroupUpdate) =>
    apiClient.patch<Group>(`/auth/groups/${groupId}`, data).then((res) => res.data),

  inviteMember: (groupId: string, data: InviteMemberRequest) =>
    apiClient.post(`/auth/groups/${groupId}/invitations`, data).then((res) => res.data),

  listInvitations: () =>
    apiClient.get<InvitationListResponse>('/auth/invitations').then((res) => res.data),

  respondToInvitation: (invitationId: string, data: InvitationActionRequest) =>
    apiClient.post(`/auth/invitations/${invitationId}`, data).then((res) => res.data),

  listGroupInvitations: (groupId: string) =>
    apiClient
      .get<InvitationListResponse>(`/auth/groups/${groupId}/invitations`)
      .then((res) => res.data),

  cancelInvitation: (groupId: string, invitationId: string) =>
    apiClient.delete(`/auth/groups/${groupId}/invitations/${invitationId}`).then((res) => res.data),

  removeMember: (groupId: string, userId: string) =>
    apiClient.delete(`/auth/groups/${groupId}/members/${userId}`).then((res) => res.data),

  leaveGroup: (groupId: string) =>
    apiClient.post(`/auth/groups/${groupId}/leave`).then((res) => res.data),

  deleteGroup: (groupId: string) =>
    apiClient.delete(`/auth/groups/${groupId}`).then((res) => res.data),
}
