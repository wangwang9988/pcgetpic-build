import api from './index'
export interface FeedbackArchiveTarget {
  product: string; kind: 'device' | 'license'; value: string;
}
export interface FeedbackHistorySummary {
  total: number; pending: number; latest_at: number | null; device_count: number;
}
export interface FeedbackContext {
  prev_feedback_id: string | null; next_feedback_id: string | null; device_position: number;
  device: FeedbackHistorySummary;
  license: {
    code: string; package_name: string | null; duration_type: number; duration_days: number;
    duration_label: string; permanent: boolean; activated_at: number | null; expires_at: number | null;
    status: number; status_label: string; bound_count: number; max_devices: number; history: FeedbackHistorySummary;
  } | null;
}
export interface Feedback {
  feedback_id: string; product: string; device_hash: string; activation_code: string | null;
  client_version: string; title: string; content: string; report_id: string | null;
  image_count: number; images_cleaned_at: number | null; status: 'pending' | 'replied' | 'closed';
  reply_content: string | null; replied_at: number | null; client_read_at: number | null;
  created_at: number; updated_at: number; error_summary?: string | null;
  context?: FeedbackContext;
  diagnostic?: { report_id: string; error_source: string; error_message: string; diagnostic_text: string;
    os_name: string; os_version: string; architecture: string; package_family: string } | null;
}
export interface FeedbackHistoryItem extends Pick<Feedback,
  'feedback_id' | 'product' | 'device_hash' | 'title' | 'client_version' | 'status' | 'created_at' | 'replied_at'> {
  content_summary: string; reply_summary: string | null;
}
export interface FeedbackHistory {
  items: FeedbackHistoryItem[]; total: number; page: number; page_size: number; summary: FeedbackHistorySummary;
}
export interface FeedbackList {
  items: Feedback[]; total: number; page: number; page_size: number;
  summary: { pending: number; today: number; handled_24h: number };
}
export type FeedbackUpdate = Pick<Feedback,
  'feedback_id' | 'status' | 'reply_content' | 'replied_at' | 'client_read_at' | 'updated_at'>
export const getFeedbacks = (params: { product?: string; status?: string; search?: string; version?: string;
  device_hash?: string; activation_code?: string; page: number }) =>
  api.get<FeedbackList>('/feedbacks', { params })
export const getFeedbackVersions = (product?: string) => api.get<string[]>('/feedbacks/versions', { params: { product } })
export const getFeedbackHistory = (id: string, kind: 'device' | 'license', page?: number) =>
  api.get<FeedbackHistory>(`/feedbacks/${id}/${kind}-history`, { params: { page } })
export const getFeedback = (id: string) => api.get<Feedback>(`/feedbacks/${id}`)
export const replyFeedback = (id: string, reply_content: string) => api.post<FeedbackUpdate>(`/feedbacks/${id}/reply`, { reply_content })
export const setFeedbackStatus = (id: string, status: 'pending' | 'closed') => api.post<FeedbackUpdate>(`/feedbacks/${id}/status`, { status })
export const deleteFeedback = (id: string) => api.delete(`/feedbacks/${id}`)
export const getFeedbackImage = (id: string, index: number) => api.get<Blob>(`/feedbacks/${id}/images/${index}`, { responseType: 'blob' })
