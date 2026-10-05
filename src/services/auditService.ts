import { AuditLog, AuditActionType } from '../types/audit';
import { authService } from './auth';

class AuditService {
  private getHeaders(): HeadersInit {
    const token = authService.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  // Récupérer la liste des logs d'audit (Admin uniquement)
  async getAuditLogs(): Promise<AuditLog[]> {
    try {
      const res = await fetch('/api/audit-logs', {
        headers: this.getHeaders(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return Array.isArray(data.logs) ? data.logs : [];
    } catch (err) {
      console.warn('[AuditService] Erreur récupération logs serveur, fallback local:', err);
      // Fallback local
      const local = localStorage.getItem('bbc49_audit_logs');
      return local ? JSON.parse(local) : [];
    }
  }

  // Enregistrer une action utilisateur dans le journal d'audit
  async log(action: string, actionType: AuditActionType = 'autre', details?: string): Promise<void> {
    try {
      const token = authService.getToken();
      if (!token) return;

      await fetch('/api/audit-logs', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ action, actionType, details }),
      });
    } catch (err) {
      // Ignorer silencieusement pour ne pas bloquer l'UX client
      console.warn('[AuditService] Log client non transmis:', err);
    }
  }
}

export const auditService = new AuditService();
