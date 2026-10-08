import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Navbar } from '../components/navbar/navbar';
import { MisArchivos } from '../components/mis-archivos/mis-archivos';

@Component({
  selector: 'app-home',
  imports: [CommonModule, Navbar, MisArchivos],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  // Sección activa en el panel de navegación
  readonly activeSection = signal<'my-files' | 'shared' | 'trash'>('my-files');

  changeSection(section: 'my-files' | 'shared' | 'trash'): void {
    this.activeSection.set(section);
  }
}
