import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

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

export type UserReportView = 'storage-top10' | 'shared-ranking';

@Component({
  selector: 'app-user-reports',
  imports: [CommonModule],
  templateUrl: './user-reports.html',
  styleUrl: './user-reports.css',
})
export class UserReports {
  // Pestaña activa dentro del subreporte de usuarios
  readonly activeSubReport = signal<UserReportView>('storage-top10');

  // Datos de reportes (inicializados vacíos según requerimiento)
  readonly storageTopUsers = signal<UserStorageReportItem[]>([]);
  readonly sharedTopUsers = signal<UserSharedReportItem[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly lastUpdatedAt = signal<Date | null>(null);

  switchSubReport(view: UserReportView): void {
    this.activeSubReport.set(view);
  }

  formatBytes(bytes?: number): string {
    if (bytes === undefined || bytes === null || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  formatDate(dateStr?: string | null): string {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  getInitials(name?: string): string {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
}
