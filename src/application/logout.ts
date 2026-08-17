import type { LogoutReason } from '@/modules/auth';
import { clearDashboardPreferences } from '@/stores/dashboardPreferences';

interface AuthLogout {
  logout(reason?: LogoutReason): void;
}

export function performLogout(auth: AuthLogout, reason: LogoutReason = 'manual'): void {
  auth.logout(reason);
  clearDashboardPreferences();
}
