import { ReactNode } from 'react'
import { usePermissions } from '../contexts/PermissionContext'

interface PermissionGateProps {
  permission: string | string[]
  children: ReactNode
  fallback?: ReactNode
  requireAll?: boolean // If true, requires ALL permissions. If false (default), requires ANY
}

export function PermissionGate({ 
  permission, 
  children, 
  fallback = null,
  requireAll = false 
}: PermissionGateProps) {
  const { hasAllPermissions, hasAnyPermission, isCompanyAdmin } = usePermissions()

  // CompanyAdmin bypasses all permission checks
  if (isCompanyAdmin) {
    return <>{children}</>
  }

  const permissions = Array.isArray(permission) ? permission : [permission]
  
  const hasAccess = requireAll 
    ? hasAllPermissions(permissions)
    : hasAnyPermission(permissions)

  if (!hasAccess) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

// Convenience wrapper for common use cases
export function CanCreate({ resource, children, fallback }: { resource: string, children: ReactNode, fallback?: ReactNode }) {
  return <PermissionGate permission={`Create ${resource}`} fallback={fallback}>{children}</PermissionGate>
}

export function CanEdit({ resource, children, fallback }: { resource: string, children: ReactNode, fallback?: ReactNode }) {
  return <PermissionGate permission={`Edit ${resource}`} fallback={fallback}>{children}</PermissionGate>
}

export function CanDelete({ resource, children, fallback }: { resource: string, children: ReactNode, fallback?: ReactNode }) {
  return <PermissionGate permission={`Delete ${resource}`} fallback={fallback}>{children}</PermissionGate>
}

export function CanView({ resource, children, fallback }: { resource: string, children: ReactNode, fallback?: ReactNode }) {
  return <PermissionGate permission={`View ${resource}`} fallback={fallback}>{children}</PermissionGate>
}
