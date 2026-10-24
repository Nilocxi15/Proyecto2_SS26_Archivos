export type ActivityReportView =
  | 'user-activity-range'
  | 'operations-by-type'
  | 'operations-by-period'
  | 'top-actions';

export interface ActivityReportTabOption {
  id: ActivityReportView;
  label: string;
  shortLabel?: string;
  icon: string;
  description: string;
}
