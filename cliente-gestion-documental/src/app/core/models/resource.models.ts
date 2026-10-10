export interface FolderItem {
  _id: string;
  id?: string;
  name: string;
  ownerId: string;
  parentId: string | null;
  parentFolderId?: string | null;
  path: string;
  ancestors?: string[];
  sharedWith?: Array<{ userId: string; permission: string }>;
  itemCount?: number;
  isTrash?: boolean;
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
  folderId: string | null;
  path?: string;
  content?: string;
  sharedWith?: Array<{ userId: string; permission: string }>;
  tags?: string[];
  isTrash?: boolean;
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

export type SelectedResource =
  { type: 'folder'; data: FolderItem } | { type: 'file'; data: FileItem };
