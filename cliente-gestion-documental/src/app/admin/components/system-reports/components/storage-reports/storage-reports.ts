import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportService } from '../../../../../core/services/report';
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
export class StorageReports implements OnInit {
  private readonly reportService = inject(ReportService);

  // Pestaña activa dentro del apartado de reportes de archivos y almacenamiento
  readonly activeSubReport = signal<StorageReportView>('by-type');

  // Estado reactivo vinculado al servicio para archivos por tipo
  readonly filesByType = this.reportService.filesByType;
  readonly isLoadingFilesByType = this.reportService.isLoadingFilesByType;
  readonly lastUpdatedFilesByTypeAt = this.reportService.lastUpdatedFilesByTypeAt;

  // Filtros para el reporte por rango de fechas
  readonly startDate = signal<string>('');
  readonly endDate = signal<string>('');

  // Colecciones reactivas para futuros reportes
  readonly filesByDateRange = signal<DateRangeFileItem[]>([]);
  readonly filesByOperations = signal<FileOperationsItem[]>([]);

  // Totales computados para KPIs del reporte por tipo
  readonly totalFilesCount = computed(() =>
    this.filesByType().reduce((acc, curr) => acc + curr.fileCount, 0),
  );

  readonly grandTotalSizeBytes = computed(() =>
    this.filesByType().reduce((acc, curr) => acc + curr.totalSizeBytes, 0),
  );

  // Estados computados según la pestaña activa
  readonly currentIsLoading = computed(() => {
    if (this.activeSubReport() === 'by-type') {
      return this.isLoadingFilesByType();
    }
    return false;
  });

  readonly currentLastUpdatedAt = computed(() => {
    if (this.activeSubReport() === 'by-type') {
      return this.lastUpdatedFilesByTypeAt();
    }
    return null;
  });

  ngOnInit(): void {
    this.loadFilesByType();
  }

  loadFilesByType(): void {
    this.reportService.getFilesGroupedByType().subscribe();
  }

  switchSubReport(view: StorageReportView): void {
    this.activeSubReport.set(view);
    if (view === 'by-type' && this.filesByType().length === 0) {
      this.loadFilesByType();
    }
  }

  refreshActiveReport(): void {
    if (this.activeSubReport() === 'by-type') {
      this.loadFilesByType();
    }
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
      case 'txt':
        return 'bi-file-earmark-text-fill text-secondary';
      case 'md':
        return 'bi-filetype-md text-info';
      default:
        return 'bi-file-earmark-fill text-primary';
    }
  }
}
