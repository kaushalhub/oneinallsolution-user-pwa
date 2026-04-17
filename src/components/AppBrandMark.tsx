import { APP_BRAND_LOWER, APP_BRAND_SHORT, APP_BRAND_UPPER } from '../constants/branding';

type Variant = 'hero' | 'screen' | 'compact' | 'bar';

type Props = {
  variant: Variant;
  className?: string;
};

export function AppBrandMark({ variant, className }: Props) {
  if (variant === 'bar') {
    return (
      <div className={`brand-bar ${className ?? ''}`.trim()}>
        <span className="brand-bar-text">{APP_BRAND_SHORT}</span>
      </div>
    );
  }

  return (
    <div className={`brand-stack ${className ?? ''}`.trim()}>
      <span className={`brand-upper brand-upper--${variant}`}>{APP_BRAND_UPPER}</span>
      <span className={`brand-lower brand-lower--${variant}`}>{APP_BRAND_LOWER}</span>
    </div>
  );
}
