export interface FolderItem {
  id: string;
  name: string;
  ownerId: string;
  parentFolderId: string | null;
  path: string;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface FileItem {
  id: string;
  name: string;
  extension: '.txt' | '.md';
  size: number; // Tamaño en bytes
  ownerId: string;
  ownerName: string;
  folderId: string | null;
  path: string;
  content?: string;
  permission?: 'Lectura' | 'Edición' | 'Comentar';
  createdAt: string;
  updatedAt: string;
}

export type SelectedResource =
  | { type: 'folder'; data: FolderItem }
  | { type: 'file'; data: FileItem };
