import { Platform } from 'react-native';

import { roomVisualFoundation } from '../../../theme/tokens';
import { useReducedMotion } from './useReducedMotion';

export type RoomAtmosphereQuality = 'balanced' | 'full' | 'static';

export function useRoomAtmosphereQuality(): RoomAtmosphereQuality {
  const reduceMotionEnabled = useReducedMotion();
  const isLowPerfAndroid =
    Platform.OS === 'android' &&
    typeof Platform.Version === 'number' &&
    Platform.Version <= roomVisualFoundation.qualityAndroidCutoffApi;

  if (reduceMotionEnabled) {
    return 'static';
  }

  if (isLowPerfAndroid) {
    return 'balanced';
  }

  return 'full';
}
