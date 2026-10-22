export type ReportCategory = 'storage' | 'users' | 'sharing' | 'activity';

export interface ReportCategoryTab {
  id: ReportCategory;
  label: string;
  icon: string;
  description: string;
}
