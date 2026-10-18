import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Navbar, NavSection } from '../../shared/components/navbar/navbar';
import { MisArchivos } from '../../shared/components/mis-archivos/mis-archivos';
import { CompartidoConmigo } from '../../shared/components/compartido-conmigo/compartido-conmigo';
import { UserManagement } from '../components/user-management/user-management';
import { ActivityLog } from '../components/activity-log/activity-log';
import { SystemReports } from '../components/system-reports/system-reports';
import { UserProfile } from '../../shared/components/user-profile/user-profile';

@Component({
  selector: 'app-admin-home',
  imports: [
    CommonModule,
    Navbar,
    MisArchivos,
    CompartidoConmigo,
    UserManagement,
    ActivityLog,
    SystemReports,
    UserProfile,
  ],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  // Sección activa en el panel de navegación
  readonly activeSection = signal<NavSection>('my-files');

  changeSection(section: NavSection): void {
    this.activeSection.set(section);
  }
}
