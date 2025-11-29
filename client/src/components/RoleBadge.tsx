import { Badge } from "@/components/ui/badge";

interface RoleBadgeProps {
  role?: string | null;
  className?: string;
}

interface RoleDisplayInfo {
  label: string;
  color: string;
  bgColor: string;
  isSpecial: boolean;
}

/**
 * Get role display information for UI components
 * This function mirrors the server-side getRoleDisplayInfo for consistency
 */
function getRoleDisplayInfo(role: string | null | undefined): RoleDisplayInfo {
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

/**
 * RoleBadge component - displays user role badge
 * Only shows badge for special roles (admin, legacy) or premium users
 */
export default function RoleBadge({ role, className = "" }: RoleBadgeProps) {
  const roleInfo = getRoleDisplayInfo(role);
  
  // Only show badge for special roles (admin, legacy) or premium
  if (!roleInfo.isSpecial && role !== 'premium') {
    return null;
  }
  
  return (
    <Badge 
      className={`${roleInfo.bgColor} border text-xs font-semibold ${className}`}
      style={roleInfo.isSpecial ? { 
        background: role === 'legacy' 
          ? 'linear-gradient(135deg, #F59E0B 0%, #F97316 100%)'
          : undefined 
      } : undefined}
    >
      {roleInfo.label}
    </Badge>
  );
}

