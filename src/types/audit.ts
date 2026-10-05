export type AuditActionType =
  | 'login'
  | 'logout'
  | 'ecriture_creation'
  | 'ecriture_modification'
  | 'ecriture_suppression'
  | 'export_pdf'
  | 'export_excel'
  | 'export_json'
  | 'import_json'
  | 'import_releve'
  | 'user_creation'
  | 'user_modification'
  | 'user_suppression'
  | 'virement'
  | 'sauvegarde'
  | 'autre';

export interface AuditLog {
  id: string;
  userId: string;
  username: string;
  userRole: string;
  ip: string;
  action: string;
  actionType: AuditActionType;
  details?: string;
  timestamp: string;
}
