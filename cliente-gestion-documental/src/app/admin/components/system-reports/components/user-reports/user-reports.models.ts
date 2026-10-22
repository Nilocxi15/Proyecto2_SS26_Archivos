export type UserReportView = 'storage-top10' | 'shared-ranking';

export interface UserStorageReportItem {
  userId: string;
  userName: string;
  userEmail: string;
  role?: string;
  isActive?: boolean;
  fileCount: number;
  totalSizeBytes: number;
  lastActivityAt?: string | null;
}

export interface UserSharedReportItem {
  userId: string;
  userName: string;
  userEmail: string;
  totalSharedResources: number;
  sharedFilesCount: number;
  sharedFoldersCount: number;
  collaboratorsCount: number;
  lastSharedAt?: string | null;
}
