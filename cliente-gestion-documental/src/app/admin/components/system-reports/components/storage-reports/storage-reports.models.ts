export type StorageReportView = 'by-type' | 'by-date-range' | 'by-operations';

export interface FileTypeReportItem {
  extension: string;
  mimeType: string;
  fileCount: number;
  totalSizeBytes: number;
  percentage: number;
}

export interface DateRangeFileItem {
  fileId: string;
  fileName: string;
  extension: string;
  ownerName: string;
  sizeBytes: number;
  createdAt: string;
  folderPath: string;
}

export interface FileOperationsItem {
  fileId: string;
  fileName: string;
  extension: string;
  ownerName: string;
  operationsCount: number;
  lastOperationType: string;
  lastOperationAt: string;
}
