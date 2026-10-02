import type { ButtonHTMLAttributes, ReactNode } from "react";
import { ASSETS } from "../../game/assets";

type Variant = "primary" | "secondary";

interface AssetButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

export function AssetButton({
  variant = "primary",
  children,
  className = "",
  ...props
}: AssetButtonProps) {
  const image = variant === "primary" ? ASSETS.ui.primary : ASSETS.ui.secondary;

  return (
    <button className={`asset-button ${className}`} {...props}>
      <img src={image} alt="" aria-hidden="true" />
      <span>{children}</span>
    </button>
  );
}

interface RoundButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: string;
  label: string;
}

export function RoundButton({
  icon,
  label,
  className = "",
  ...props
}: RoundButtonProps) {
  return (
    <button
      className={`round-button ${className}`}
      aria-label={label}
      title={label}
      {...props}
    >
      <img src={icon} alt="" aria-hidden="true" />
    </button>
  );
}
