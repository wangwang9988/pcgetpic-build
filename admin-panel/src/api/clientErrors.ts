import api from './index'

export interface ClientErrorSummary {
  unique_reports: number
  total_occurrences: number
  reports_24h: number
  occurrences_24h: number
  latest_at: number | null
}

export interface ClientErrorListItem {
  report_id: string
  product: string
  activation_code_mask: string
  activation_code: string | null
  package_name: string | null
  duration_type: number | null
  duration_days: number | null
  activated_at: number | null
  license_duration: string
  expires_at: number | null
  device_hash: string
  client_version: string
  os_name: string
  os_version: string
  architecture: string
  package_family: string
  error_source: string
  error_summary: string
  occurrence_count: number
  first_seen_at: number
  last_seen_at: number
}

export interface ClientErrorDetail extends ClientErrorListItem {
  error_message: string
  diagnostic_text: string
  diagnostic_event_id?: string | null
  diagnostic_history?: Array<{ event_id: string; received_at: number; legacy_snapshot: number }>
}

export interface ClientErrorListResponse {
  total: number
  page: number
  page_size: number
  items: ClientErrorListItem[]
}

export function getClientErrorSummary() {
  return api.get<ClientErrorSummary>('/client-errors/summary')
}

export function getClientErrors(params: {
  page: number
  page_size: number
  source?: string
  version?: string
  search?: string
}) {
  return api.get<ClientErrorListResponse>('/client-errors', { params })
}

export function getClientErrorDetail(reportId: string, eventId?: string) {
  return api.get<ClientErrorDetail>(`/client-errors/${encodeURIComponent(reportId)}`, { params: { event_id: eventId } })
}
