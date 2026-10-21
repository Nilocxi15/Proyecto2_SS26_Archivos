import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StorageReports } from './components/storage-reports/storage-reports';
import { UserReports } from './components/user-reports/user-reports';
import { SharingReports } from './components/sharing-reports/sharing-reports';
import { ActivityReports } from './components/activity-reports/activity-reports';

export type ReportCategory = 'storage' | 'users' | 'sharing' | 'activity';

export interface ReportCategoryTab {
  id: ReportCategory;
  label: string;
  icon: string;
  description: string;
}

@Component({
  selector: 'app-system-reports',
  imports: [
    CommonModule,
    StorageReports,
    UserReports,
    SharingReports,
    ActivityReports,
  ],
  templateUrl: './system-reports.html',
  styleUrl: './system-reports.css',
})
export class SystemReports {
  readonly activeCategory = signal<ReportCategory>('storage');

  readonly categories: ReportCategoryTab[] = [
    {
      id: 'storage',
      label: 'Reportes de archivos y almacenamiento',
      icon: 'bi-hdd-network',
      description: 'Métricas de espacio, tipos de archivo y almacenamiento ocupado',
    },
    {
      id: 'users',
      label: 'Reportes de usuarios',
      icon: 'bi-people',
      description: 'Estadísticas de usuarios registrados, roles y estado de cuentas',
    },
    {
      id: 'sharing',
      label: 'Reportes de compartición',
      icon: 'bi-diagram-3',
      description: 'Análisis de carpetas y archivos compartidos y permisos asignados',
    },
    {
      id: 'activity',
      label: 'Reportes de actividad',
      icon: 'bi-clock-history',
      description: 'Registro de auditoría, operaciones realizadas y accesos al sistema',
    },
  ];

  selectCategory(category: ReportCategory): void {
    this.activeCategory.set(category);
  }
}
