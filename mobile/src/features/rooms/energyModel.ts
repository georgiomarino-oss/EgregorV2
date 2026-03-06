import type { CollectiveEnergyLevel } from '../../theme/tokens';

export function resolveCollectiveEnergyLevel(participantCount: number): CollectiveEnergyLevel {
  const normalizedCount = Number.isFinite(participantCount) ? Math.max(0, participantCount) : 0;

  if (normalizedCount >= 30) {
    return 'high';
  }

  if (normalizedCount >= 10) {
    return 'medium';
  }

  return 'low';
}
