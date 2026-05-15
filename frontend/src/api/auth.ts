import { apiClient } from './client'

export interface LoginRequest {
  username: string
  password: string
}

export interface User {
  id: string
  username: string
  email: string
  groups: string[]
}

export interface LoginResponse {
  access_token: string
  token_type: string
  user: User
}

export interface GroupCreate {
  name: string
}

export interface Group {
  id: string
  name: string
  owner_id: string | null
  member_count: number
}

export interface GroupListResponse {
  total: number
  data: Group[]
}

export interface AddMemberRequest {
  username: string
}

export const authApi = {
  login: (data: LoginRequest) =>
    apiClient.post<LoginResponse>('/auth/login', data).then((res) => res.data),

  me: () => apiClient.get<User>('/auth/me').then((res) => res.data),

  createGroup: (data: GroupCreate) =>
    apiClient.post<Group>('/auth/groups', data).then((res) => res.data),

  listGroups: () => apiClient.get<GroupListResponse>('/auth/groups').then((res) => res.data),

  addMember: (groupId: string, data: AddMemberRequest) =>
    apiClient.post(`/auth/groups/${groupId}/members`, data).then((res) => res.data),

  removeMember: (groupId: string, userId: string) =>
    apiClient.delete(`/auth/groups/${groupId}/members/${userId}`).then((res) => res.data),
}
