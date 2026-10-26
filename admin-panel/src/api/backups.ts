import api from './index'
export type BackupKind = 'main' | 'archive'
export type BackupFile = { name: string; bytes: number; sha256: string }
export type BackupRecord = { id: string; createdAt: number; expiresAt: number; files: { main: BackupFile; archive?: BackupFile } }
export const getBackups = () => api.get<{ items: BackupRecord[]; limit: number; omitted: number }>('/backups')
export const createBackupDownload = (id: string, kind: BackupKind) =>
  api.post<{ url: string; filename: string; expiresIn: number }>(`/backups/${encodeURIComponent(id)}/${kind}/ticket`)
