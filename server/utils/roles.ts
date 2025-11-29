/**
 * Role-based access control utilities
 */

export type UserRole = 'admin' | 'free' | 'premium' | 'legacy';

export interface UserWithRole {
  id: number;
  role?: UserRole | string | null;
  subscriptionStatus?: string | null;
  isBetaUser?: boolean | null;
}

export interface RoleDisplayInfo {
  label: string;
  color: string;
  bgColor: string;
  isSpecial: boolean;
}

/**
 * Check if user has admin role
 */
export function isAdmin(user: UserWithRole | null | undefined): boolean {
  return user?.role === 'admin';
}

/**
 * Check if user has premium access (premium or legacy role)
 */
export function hasPremiumAccess(user: UserWithRole | null | undefined): boolean {
  if (!user) return false;
  
  // Admin has all access
  if (user.role === 'admin') return true;
  
  // Legacy users have premium access
  if (user.role === 'legacy') return true;
  
  // Premium role
  if (user.role === 'premium') return true;
  
  // Beta users have premium access (backward compatibility)
  if (user.isBetaUser) return true;
  
  // Check subscription status for backward compatibility
  if (user.subscriptionStatus === 'premium' || user.subscriptionStatus === 'trial') {
    return true;
  }
  
  return false;
}

/**
 * Check if user can access courses/learning modules
 */
export function canAccessCourses(user: UserWithRole | null | undefined): boolean {
  return hasPremiumAccess(user);
}

/**
 * Check if user can view trading alerts
 */
export function canViewTradingAlerts(user: UserWithRole | null | undefined): boolean {
  return hasPremiumAccess(user);
}

/**
 * Check if user can create trading alerts
 */
export function canCreateTradingAlerts(user: UserWithRole | null | undefined): boolean {
  return hasPremiumAccess(user);
}

/**
 * Get user role display info with styling information
 */
export function getRoleDisplayInfo(role: string | null | undefined): RoleDisplayInfo {
  switch (role) {
    case 'admin':
      return {
        label: 'Admin',
        color: '#DC2626',
        bgColor: 'bg-red-100 text-red-800 border-red-200',
        isSpecial: true,
      };
    case 'legacy':
      return {
        label: 'Legacy',
        color: '#F59E0B',
        bgColor: 'bg-gradient-to-r from-amber-400 to-orange-400 text-amber-900 border-amber-300',
        isSpecial: true,
      };
    case 'premium':
      return {
        label: 'Premium',
        color: '#10B981',
        bgColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        isSpecial: false,
      };
    case 'free':
    default:
      return {
        label: 'Free',
        color: '#6B7280',
        bgColor: 'bg-gray-100 text-gray-800 border-gray-200',
        isSpecial: false,
      };
  }
}

