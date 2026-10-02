import type { ReactNode } from 'react';
import { ASSETS } from '../../game/assets';

export function ScreenPanel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`screen-panel ${className}`} style={{ backgroundImage: `url(${ASSETS.ui.panel})` }}>{children}</section>;
}
