import type { UserRole } from '@/src/constants';

export type Permission =
  | 'manage_members'
  | 'manage_subscription'
  | 'manage_settings'
  | 'manage_finances'
  | 'view_finances'
  | 'view_audit'
  | 'delete_records';

export const ROLE_PERMISSION_MAP: Record<UserRole, Permission[]> = {
  super_admin: [
    'manage_members',
    'manage_subscription',
    'manage_settings',
    'manage_finances',
    'view_finances',
    'view_audit',
    'delete_records',
  ],
  admin: [
    'manage_members',
    'manage_finances',
    'view_finances',
    'view_audit',
    'delete_records',
  ],
  treasurer: [
    'manage_finances',
    'view_finances',
  ],
  viewer: [
    'view_finances',
  ],
  member: [
    'view_finances',
  ],
  muqtadi: [],
};
