"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { sfx } from "@/lib/sfx";

type Variant = "green" | "yellow" | "blue" | "pink" | "purple" | "red" | "dark";
type Size = "sm" | "md" | "lg" | "icon";

const SIZE: Record<Size, string> = {
  sm: "h-10 px-4 text-sm",
  md: "h-12 px-6 text-base",
  lg: "h-14 px-8 text-xl",
  icon: "h-11 w-11 text-base",
};

interface Props {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  className?: string;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  ariaLabel?: string;
  silent?: boolean;
  autoFocus?: boolean;
}

export function Btn({ children, variant = "green", size = "md", className = "", onClick, href, disabled, ariaLabel, silent, autoFocus }: Props) {
  const cls = `btn3d ${variant} ${SIZE[size]} ${className}`;
  const handle = () => {
    if (!silent) sfx.tap();
    onClick?.();
  };
  if (href) {
    return (
      <Link href={href} className={cls} onClick={handle} aria-label={ariaLabel}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" className={cls} onClick={handle} disabled={disabled} aria-label={ariaLabel} autoFocus={autoFocus}>
      {children}
    </button>
  );
}
