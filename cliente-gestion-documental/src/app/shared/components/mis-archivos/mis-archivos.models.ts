import { ResourcePermission, SharedUserEntry } from '../../../core/models/resource.models';

export interface ResourceTrashTarget {
  id: string;
  name: string;
  type: 'folder' | 'file';
}

export interface ShareFolderState {
  folderId: string;
  folderName: string;
  sharedWith: SharedUserEntry[];
}
