import ambientAnimation from '../../assets/lottie/cosmic-ambient.json';
import { StyleSheet } from 'react-native';

import { SecondaryButton } from '../components/AppButtons';
import { LiveLogo } from '../components/LiveLogo';
import { Screen } from '../components/Screen';
import { StateSurface } from '../components/StateSurface';
import { SurfaceCard } from '../components/SurfaceCard';
import { Typography } from '../components/Typography';
import { sectionGap } from '../theme/layout';
import { colors } from '../theme/tokens';

interface MissingEnvScreenProps {
  missingOptional: string[];
  missingRequired: string[];
  onContinueWithoutOptional?: () => void;
}

export function MissingEnvScreen({
  missingOptional,
  missingRequired,
  onContinueWithoutOptional,
}: MissingEnvScreenProps) {
  const hasBlockingIssues = missingRequired.length > 0;

  return (
    <Screen
      ambientSource={ambientAnimation}
      contentContainerStyle={styles.content}
      variant="auth"
      withTabBarInset={false}
    >
      <LiveLogo size={46} />
      <Typography variant="H1" weight="bold">
        Environment check
      </Typography>
      <Typography color={colors.textSecondary}>
        We paused startup while validating required runtime services.
      </Typography>

      {hasBlockingIssues ? (
        <StateSurface
          actionLabel="Review required keys"
          body="One or more required service variables are missing."
          kind="error"
          title="Cannot continue yet"
        />
      ) : missingOptional.length > 0 ? (
        <StateSurface
          actionLabel="Continue in fallback"
          body="Optional keys are missing. Expo fallback mode is available."
          kind="empty"
          {...(onContinueWithoutOptional ? { onAction: onContinueWithoutOptional } : {})}
          title="Optional configuration missing"
        />
      ) : (
        <StateSurface
          body="All required and optional environment keys are present."
          kind="empty"
          title="Environment verified"
        />
      )}

      <SurfaceCard style={styles.section}>
        <Typography variant="H2" weight="bold">
          Required
        </Typography>
        {missingRequired.length > 0 ? (
          missingRequired.map((envKey) => (
            <Typography key={envKey} color={colors.textSecondary}>
              {`- ${envKey}`}
            </Typography>
          ))
        ) : (
          <Typography color={colors.success}>All required values are set.</Typography>
        )}
      </SurfaceCard>

      <SurfaceCard style={styles.section}>
        <Typography variant="H2" weight="bold">
          Optional For Expo Go
        </Typography>
        {missingOptional.length > 0 ? (
          <>
            {missingOptional.map((envKey) => (
              <Typography key={envKey} color={colors.textSecondary}>
                {`- ${envKey}`}
              </Typography>
            ))}
            <Typography color={colors.textSecondary} variant="Caption">
              You can continue without optional values in Expo Go fallback mode.
            </Typography>
          </>
        ) : (
          <Typography color={colors.success}>Optional values are set.</Typography>
        )}
      </SurfaceCard>

      <SurfaceCard style={styles.section}>
        <Typography color={colors.textSecondary}>
          Add values to `mobile/.env`, restart Metro, then relaunch Egregor.
        </Typography>
        {!hasBlockingIssues && missingOptional.length > 0 && onContinueWithoutOptional ? (
          <SecondaryButton onPress={onContinueWithoutOptional} title="Continue In Fallback Mode" />
        ) : null}
      </SurfaceCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: sectionGap,
  },
  section: {
    gap: sectionGap,
  },
});
