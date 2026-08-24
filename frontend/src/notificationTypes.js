import {
  AlertTriangle, Bell, Building2, Factory, FileText, PackageOpen, RefreshCw, Timer,
} from 'lucide-react'

export const NOTIF_TYPES = [
  { value: 'status_change', label: 'Status Change', Icon: RefreshCw },
  { value: 'delay', label: 'Delay', Icon: Timer },
  { value: 'customs_release', label: 'Customs Release', Icon: Building2 },
  { value: 'factory_unloading', label: 'Factory Unloading', Icon: Factory },
  { value: 'container_returned', label: 'Container Returned', Icon: PackageOpen },
  { value: 'document_uploaded', label: 'Document', Icon: FileText },
  { value: 'deadline', label: 'Deadline', Icon: AlertTriangle },
]

export function notifMeta(notifType) {
  return NOTIF_TYPES.find((t) => t.value === notifType) || { label: notifType, Icon: Bell }
}
