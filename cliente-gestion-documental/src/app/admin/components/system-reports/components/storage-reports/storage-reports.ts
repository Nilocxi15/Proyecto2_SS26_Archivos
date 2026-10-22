import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  StorageReportView,
  FileTypeReportItem,
  DateRangeFileItem,
  FileOperationsItem,
} from './storage-reports.models';

@Component({
  selector: 'app-storage-reports',
  imports: [CommonModule, FormsModule],
  templateUrl: './storage-reports.html',
  styleUrl: './storage-reports.css',
})
export class StorageReports {
  // Pestaña activa dentro del apartado de reportes de archivos y almacenamiento
  readonly activeSubReport = signal<StorageReportView>('by-type');

  // Estado de carga y última consulta
  readonly isLoading = signal<boolean>(false);
  readonly lastUpdatedAt = signal<Date | null>(null);

  // Filtros para el reporte por rango de fechas
  readonly startDate = signal<string>('');
  readonly endDate = signal<string>('');

  // Colecciones reactivas de los reportes (listas para ser vinculadas con el servicio)
  readonly filesByType = signal<FileTypeReportItem[]>([]);
  readonly filesByDateRange = signal<DateRangeFileItem[]>([]);
  readonly filesByOperations = signal<FileOperationsItem[]>([]);

  switchSubReport(view: StorageReportView): void {
    this.activeSubReport.set(view);
  }

  refreshActiveReport(): void {
    this.lastUpdatedAt.set(new Date());
  }

  applyDateFilter(): void {
    this.refreshActiveReport();
  }

  clearDateFilter(): void {
    this.startDate.set('');
    this.endDate.set('');
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

  getFileIcon(extension?: string): string {
    const ext = (extension || '').toLowerCase().replace('.', '');
    switch (ext) {
      case 'pdf':
        return 'bi-file-earmark-pdf-fill text-danger';
      case 'txt':
        return 'bi-file-earmark-text-fill text-secondary';
      case 'md':
        return 'bi-filetype-md text-info';
      case 'doc':
      case 'docx':
        return 'bi-file-earmark-word-fill text-primary';
      case 'xls':
      case 'xlsx':
        return 'bi-file-earmark-excel-fill text-success';
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'svg':
        return 'bi-file-earmark-image-fill text-warning';
      default:
        return 'bi-file-earmark-fill text-secondary';
    }
  }
}
