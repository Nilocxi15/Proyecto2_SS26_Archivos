export type ResourcePermission = 'lectura' | 'edicion' | 'comentar';

export interface SharedUserEntry {
  userId: string;
  userName?: string;
  userEmail?: string;
  permission: ResourcePermission | string;
}

export interface FileComment {
  _id: string;
  authorId: string;
  authorName: string;
  authorEmail?: string;
  content: string;
  createdAt: string;
  resolved?: boolean;
}

export interface FolderItem {
  _id: string;
  id?: string;
  name: string;
  ownerId: string;
  ownerName?: string;
  ownerEmail?: string;
  myPermission?: ResourcePermission | string;
  parentId: string | null;
  parentFolderId?: string | null;
  path: string;
  ancestors?: string[];
  sharedWith?: SharedUserEntry[];
  itemCount?: number;
  isTrash?: boolean;
  trashedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FileItem {
  _id: string;
  id?: string;
  name: string;
  extension: string;
  sizeBytes: number;
  size?: number;
  ownerId: string;
  ownerName?: string;
  ownerEmail?: string;
  myPermission?: ResourcePermission | string;
  folderId: string | null;
  path?: string;
  content?: string;
  sharedWith?: SharedUserEntry[];
  comments?: FileComment[];
  tags?: string[];
  isTrash?: boolean;
  trashedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BreadcrumbItem {
  _id: string;
  name: string;
}

export interface MisArchivosData {
  currentFolder: FolderItem | null;
  breadcrumbs: BreadcrumbItem[];
  folders: FolderItem[];
  files: FileItem[];
}

export interface MisArchivosResponse {
  status: string;
  data: MisArchivosData;
}

export interface CreateFolderRequest {
  name: string;
  parentId?: string | null;
}

export interface CreateFileRequest {
  name: string;
  extension?: string;
  content: string;
  folderId?: string | null;
  tags?: string[];
}

export interface FileDownloadData {
  fileName: string;
  extension: string;
  content: string;
  mimeType: string;
}

export interface FileDownloadResponse {
  status: string;
  data: FileDownloadData;
}

export interface ActiveWorkspaceContext {
  file: FileItem;
  origin: 'my-files' | 'shared';
}

export type SelectedResource =
  | { type: 'folder'; data: FolderItem }
  | { type: 'file'; data: FileItem };
