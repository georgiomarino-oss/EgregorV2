import { feedbackSurface } from '../theme/tokens';
import { Button } from './Button';
import { EmptyStateCard } from './EmptyStateCard';
import { LoadingStateCard } from './LoadingStateCard';
import { RetryPanel } from './RetryPanel';

type StateSurfaceKind = 'empty' | 'error' | 'loading' | 'retry';

interface StateSurfaceProps {
  actionLabel?: string;
  body?: string;
  kind: StateSurfaceKind;
  onAction?: () => void;
  title: string;
  subtitle?: string;
}

export function StateSurface({
  actionLabel = 'Try again',
  body,
  kind,
  onAction,
  subtitle,
  title,
}: StateSurfaceProps) {
  if (kind === 'loading') {
    const loadingSubtitle = subtitle ?? body;
    return (
      <LoadingStateCard {...(loadingSubtitle ? { subtitle: loadingSubtitle } : {})} title={title} />
    );
  }

  if (kind === 'error') {
    return (
      <EmptyStateCard
        action={
          onAction ? (
            <Button onPress={onAction} title={actionLabel} variant="secondary" />
          ) : undefined
        }
        backgroundColor={feedbackSurface.errorPanelBackground}
        body={body}
        bodyColor={feedbackSurface.errorBody}
        borderColor={feedbackSurface.errorPanelBorder}
        iconBackgroundColor={feedbackSurface.iconBackground}
        iconBorderColor={feedbackSurface.iconBorder}
        iconName="alert-circle-outline"
        iconTint={feedbackSurface.iconTint}
        title={title}
        titleColor={feedbackSurface.errorTitle}
      />
    );
  }

  if (kind === 'retry') {
    return (
      <RetryPanel
        message={body ?? subtitle ?? 'The current state could not be refreshed.'}
        onRetry={() => {
          if (onAction) {
            onAction();
          }
        }}
        retryLabel={actionLabel}
        title={title}
      />
    );
  }

  return (
    <EmptyStateCard
      action={
        onAction ? <Button onPress={onAction} title={actionLabel} variant="secondary" /> : undefined
      }
      backgroundColor={feedbackSurface.loadingPanelBackground}
      body={body}
      bodyColor={feedbackSurface.loadingBody}
      borderColor={feedbackSurface.loadingPanelBorder}
      iconBackgroundColor={feedbackSurface.iconBackground}
      iconBorderColor={feedbackSurface.iconBorder}
      iconName="check-circle-outline"
      iconTint={feedbackSurface.iconTint}
      title={title}
      titleColor={feedbackSurface.loadingTitle}
    />
  );
}

export type { StateSurfaceKind, StateSurfaceProps };
