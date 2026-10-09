import { Component } from '@angular/core';

export type ReportCategory = 'storage' | 'users' | 'sharing' | 'activity';

@Component({
  selector: 'app-system-reports',
  imports: [],
  templateUrl: './system-reports.html',
  styleUrl: './system-reports.css',
})
export class SystemReports {}
