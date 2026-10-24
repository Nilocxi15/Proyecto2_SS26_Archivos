export type ActivityAction =
  | 'crear'
  | 'modificar'
  | 'mover'
  | 'eliminar'
  | 'restaurar'
  | 'compartir'
  | 'descargar';

export type ActivityResourceType = 'archivo' | 'carpeta';

export type ActivityCategoryFilter = 'all' | 'archivo' | 'carpeta' | 'compartido';

export interface ActivityLogDetails {
  name?: string;
  extension?: string;
  field?: string;
  oldName?: string;
  newName?: string;
  comment?: string;
  fromFolderId?: string;
  toFolderId?: string;
  fromFolderName?: string;
  toFolderName?: string;
  sharedToUserId?: string;
  sharedToUserName?: string;
  sharedToUserEmail?: string;
  permission?: 'lectura' | 'edicion' | 'comentar';
  moveToTrash?: boolean;
  restoredFromTrash?: boolean;
  fileSizeBytes?: number;
  [key: string]: unknown;
}

export interface ActivityLogItem {
  _id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole?: string;
  action: ActivityAction;
  resourceType: ActivityResourceType;
  resourceId: string;
  resourceName: string;
  details?: ActivityLogDetails;
  timestamp: string | Date;
  ipAddress?: string;
}

export interface ActivityLogFilters {
  searchTerm: string;
  category: ActivityCategoryFilter;
  action: 'all' | ActivityAction;
  startDate: string;
  endDate: string;
  sortOrder: 'desc' | 'asc';
}

export interface ActivityLogSummaryStats {
  totalCount: number;
  filesCount: number;
  foldersCount: number;
  sharesCount: number;
  uniqueUsersCount: number;
}
