import type { ButtonProps } from './Button';
import { Button } from './Button';

type BaseButtonProps = Omit<ButtonProps, 'variant'>;

export function PrimaryButton(props: BaseButtonProps) {
  return <Button {...props} variant="primary" />;
}

export function SecondaryButton(props: BaseButtonProps) {
  return <Button {...props} variant="secondary" />;
}

export function GhostButton(props: BaseButtonProps) {
  return <Button {...props} variant="ghost" />;
}

export type { BaseButtonProps };
