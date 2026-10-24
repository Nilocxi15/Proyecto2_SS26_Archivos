import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivityReportView, ActivityReportTabOption } from './activity-reports.models';

@Component({
  selector: 'app-activity-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './activity-reports.html',
  styleUrl: './activity-reports.css',
})
export class ActivityReports {
  // Pestaña activa dentro del apartado de reportes de actividad
  readonly activeSubReport = signal<ActivityReportView>('user-activity-range');

  // Estado reactivo de control y actualización
  readonly currentLastUpdatedAt = signal<Date | null>(new Date());
  readonly currentIsLoading = signal<boolean>(false);

  switchSubReport(view: ActivityReportView): void {
    this.activeSubReport.set(view);
  }

  refreshActiveReport(): void {
    this.currentIsLoading.set(true);
    setTimeout(() => {
      this.currentLastUpdatedAt.set(new Date());
      this.currentIsLoading.set(false);
    }, 400);
  }

  formatDate(dateStr?: string | null): string {
    if (!dateStr) return 'No disponible';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('es-GT', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  }
}
