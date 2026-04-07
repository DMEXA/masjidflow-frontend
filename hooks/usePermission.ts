'use client';

import { useAuthStore } from '@/src/store/auth.store';
import { ROLE_PERMISSIONS, USER_ROLES } from '@/src/constants';
import type { UserRole } from '@/src/constants';

type Permission = keyof typeof ROLE_PERMISSIONS[UserRole];

export function usePermission(role?: UserRole) {
  const { user, hasPermission, isRole } = useAuthStore();
  const effectiveRole = role ?? user?.role;

  const canManageMembers = hasPermission('canManageMembers');
  const canManageDonations = hasPermission('canManageDonations');
  const canManageExpenses = hasPermission('canManageExpenses');
  const canViewReports = hasPermission('canViewReports');
  const canViewAuditLogs = hasPermission('canViewAuditLogs');
  const canManageSettings = hasPermission('canManageSettings');
  const canManageSubscription = hasPermission('canManageSubscription');
  const legacyCanDelete = hasPermission('canDelete');

  const isSuperAdmin = effectiveRole === USER_ROLES.SUPER_ADMIN;
  const isAdmin = effectiveRole === USER_ROLES.ADMIN;
  const isTreasurer = effectiveRole === USER_ROLES.TREASURER;
  const isMember = effectiveRole === USER_ROLES.MEMBER;
  const isMuqtadi = effectiveRole === USER_ROLES.MUQTADI;
  const isViewer = effectiveRole === USER_ROLES.VIEWER;

  const isReadOnlyRole = isViewer || isMuqtadi;
  const hasFullAccessRole = isSuperAdmin || isAdmin || isTreasurer;

  const canView = true;
  const canCreate = hasFullAccessRole && !isReadOnlyRole;
  const canEdit = hasFullAccessRole && !isReadOnlyRole;
  const canDelete = role ? canCreate : legacyCanDelete;

  const checkPermission = (permission: Permission): boolean => {
    return hasPermission(permission);
  };

  return {
    user,
    canManageMembers,
    canManageDonations,
    canManageExpenses,
    canViewReports,
    canViewAuditLogs,
    canManageSettings,
    canManageSubscription,
    canView,
    canCreate,
    canEdit,
    canDelete,
    isSuperAdmin,
    isAdmin,
    isTreasurer,
    isMember,
    isMuqtadi,
    isViewer,
    checkPermission,
  };
}
