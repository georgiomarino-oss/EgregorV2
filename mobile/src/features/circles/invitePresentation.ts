import type { CircleInviteStatus, CircleMembershipRole } from '../../lib/api/circles';
import type { StatusChipTone } from '../../components/StatusChip';

export type InviteDisplayStatus = CircleInviteStatus | 'invalid';

export function toRoleLabel(role: CircleMembershipRole) {
  if (role === 'owner') {
    return 'Owner';
  }
  if (role === 'steward') {
    return 'Steward';
  }
  return 'Member';
}

export function toInviteStatusLabel(status: InviteDisplayStatus) {
  if (status === 'pending') {
    return 'Pending';
  }
  if (status === 'accepted') {
    return 'Accepted';
  }
  if (status === 'declined') {
    return 'Declined';
  }
  if (status === 'revoked') {
    return 'Revoked';
  }
  if (status === 'expired') {
    return 'Expired';
  }
  return 'Invalid';
}

export function toInviteStatusTone(status: InviteDisplayStatus): StatusChipTone {
  if (status === 'accepted') {
    return 'success';
  }
  if (status === 'pending') {
    return 'warning';
  }
  if (status === 'declined') {
    return 'neutral';
  }
  if (status === 'revoked' || status === 'invalid') {
    return 'danger';
  }
  return 'danger';
}

export function formatInviteExpiry(expiresAt: string) {
  const expiresAtMs = Date.parse(expiresAt);
  if (!Number.isFinite(expiresAtMs)) {
    return 'Expiry unavailable';
  }

  const diffMs = expiresAtMs - Date.now();
  if (diffMs <= 0) {
    return 'Expired';
  }

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) {
    return 'Expires in less than 1 hour';
  }

  if (diffHours < 24) {
    return `Expires in ${diffHours}h`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `Expires in ${diffDays}d`;
}
