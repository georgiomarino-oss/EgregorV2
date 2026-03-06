import type { StyleProp, ViewStyle } from 'react-native';

import { Button } from './Button';
import { InlineErrorCard, type InlineErrorTone } from './InlineErrorCard';

interface RetryPanelProps {
  loading?: boolean;
  message: string;
  onRetry: () => void;
  retryAccessibilityHint?: string;
  retryAccessibilityLabel?: string;
  retryLabel?: string;
  style?: StyleProp<ViewStyle>;
  title?: string;
  tone?: InlineErrorTone;
}

export function RetryPanel({
  loading = false,
  message,
  onRetry,
  retryAccessibilityHint,
  retryAccessibilityLabel,
  retryLabel = 'Retry',
  style,
  title,
  tone = 'error',
}: RetryPanelProps) {
  const titleProps = title ? { title } : {};
  const buttonAccessibilityProps = retryAccessibilityHint
    ? { accessibilityHint: retryAccessibilityHint }
    : {};
  const retryLabelOverride = retryAccessibilityLabel ?? `${retryLabel}. Try loading again`;

  return (
    <InlineErrorCard
      action={
        <Button
          {...buttonAccessibilityProps}
          accessibilityLabel={retryLabelOverride}
          loading={loading}
          onPress={onRetry}
          title={retryLabel}
          variant="secondary"
        />
      }
      message={message}
      style={style}
      tone={tone}
      {...titleProps}
    />
  );
}

export type { RetryPanelProps };
