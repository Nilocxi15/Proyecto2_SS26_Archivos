import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Navbar, NavSection } from '../../shared/components/navbar/navbar';
import { MisArchivos } from '../../shared/components/mis-archivos/mis-archivos';
import { CompartidoConmigo } from '../../shared/components/compartido-conmigo/compartido-conmigo';
import { Papelera } from '../../shared/components/papelera/papelera';
import { UserManagement } from '../components/user-management/user-management';
import { ActivityLog } from '../components/activity-log/activity-log';
import { SystemReports } from '../components/system-reports/system-reports';
import { UserProfile } from '../../shared/components/user-profile/user-profile';
import { FileWorkspace } from '../../shared/components/file-workspace/file-workspace';
import { ResourceService } from '../../core/services/resource.service';

@Component({
  selector: 'app-admin-home',
  imports: [
    CommonModule,
    Navbar,
    MisArchivos,
    CompartidoConmigo,
    Papelera,
    UserManagement,
    ActivityLog,
    SystemReports,
    UserProfile,
    FileWorkspace,
  ],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  readonly resourceService = inject(ResourceService);

  // Sección activa en el panel de navegación
  readonly activeSection = signal<NavSection>('my-files');

  changeSection(section: NavSection): void {
    this.resourceService.closeFileWorkspace();
    this.activeSection.set(section);
  }
}
