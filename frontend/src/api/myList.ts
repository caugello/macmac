import { apiClient } from './client'
import type { MyListItemCreate, MyListItemOut, MyListResponse, DeleteResponse } from '../lib/types'

export const myListApi = {
  list: () => apiClient.get<MyListResponse>('/my-list').then((res) => res.data),

  add: (data: MyListItemCreate) =>
    apiClient.post<MyListItemOut>('/my-list', data).then((res) => res.data),

  remove: (catalogItemId: string) =>
    apiClient.delete<DeleteResponse>(`/my-list/${catalogItemId}`).then((res) => res.data),

  clear: () => apiClient.delete<DeleteResponse>('/my-list').then((res) => res.data),

  merge: (items: MyListItemCreate[]) =>
    apiClient.post<MyListResponse>('/my-list/merge', { items }).then((res) => res.data),
}
