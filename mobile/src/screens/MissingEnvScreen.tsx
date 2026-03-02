import ambientAnimation from '../../assets/lottie/cosmic-ambient.json';
import { StyleSheet } from 'react-native';

import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
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
      <Typography variant="H1" weight="bold">
        Missing Environment Values
      </Typography>
      <Typography color={colors.textSecondary}>
        Egregor v2 needs environment configuration before startup.
      </Typography>

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
          Add values to `mobile/.env`, restart Metro, and relaunch the app.
        </Typography>
        {!hasBlockingIssues && missingOptional.length > 0 && onContinueWithoutOptional ? (
          <Button
            onPress={onContinueWithoutOptional}
            title="Continue In Fallback Mode"
            variant="secondary"
          />
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
