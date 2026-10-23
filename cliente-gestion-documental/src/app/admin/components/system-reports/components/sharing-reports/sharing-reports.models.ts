export type SharingReportView =
  | 'most-shared-files'
  | 'shared-by-user'
  | 'received-by-user';

export interface SharedCollaboratorDetail {
  userId: string;
  userName: string;
  userEmail: string;
  permission: 'lectura' | 'edicion' | 'comentar';
}

export interface MostSharedFileReportItem {
  fileId: string;
  fileName: string;
  extension: string;
  sizeBytes: number;
  ownerName: string;
  ownerEmail: string;
  collaboratorsCount: number;
  collaborators: SharedCollaboratorDetail[];
  lastSharedAt?: string | null;
  folderPath?: string;
}

export interface UserResourceSharedItem {
  resourceId: string;
  resourceName: string;
  resourceType: 'file' | 'folder';
  extension?: string;
  sizeBytes?: number;
  folderPath?: string;
  collaboratorsCount: number;
  collaborators: SharedCollaboratorDetail[];
  sharedAt?: string | null;
}

export interface UserResourceReceivedItem {
  resourceId: string;
  resourceName: string;
  resourceType: 'file' | 'folder';
  extension?: string;
  sizeBytes?: number;
  folderPath?: string;
  ownerName: string;
  ownerEmail: string;
  permission: 'lectura' | 'edicion' | 'comentar';
  receivedAt?: string | null;
}

export interface UserSelectOption {
  userId: string;
  userName: string;
  userEmail: string;
}
