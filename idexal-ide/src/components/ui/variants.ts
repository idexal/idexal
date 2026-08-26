/**
 * Idexal IDE Component Variants
 * 
 * Reusable variant definitions using class-variance-authority (cva)
 * for consistent component styling across the application.
 */

import { cva, type VariantProps } from "class-variance-authority"

// ============================================
// Button Variants
// ============================================

export const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-brand-primary text-white hover:bg-brand-primary-dark shadow-sm hover:shadow-brand",
        secondary: "bg-surface-2 text-text-primary border border-border hover:bg-surface-3",
        ghost: "text-text-secondary hover:bg-surface-2 hover:text-text-primary",
        destructive: "bg-error text-white hover:bg-error-dark",
        outline: "border border-border text-text-primary hover:bg-surface-2",
        link: "text-brand-primary underline-offset-4 hover:underline",
        brand: "bg-gradient-to-r from-brand-primary to-brand-secondary text-white hover:from-brand-primary-dark hover:to-brand-secondary-dark shadow-brand hover:shadow-brand-lg",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

// ============================================
// Input Variants
// ============================================

export const inputVariants = cva(
  "flex w-full rounded-lg bg-surface-bg border px-3 py-2 text-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "border-border",
        error: "border-error focus-visible:ring-error",
        success: "border-success focus-visible:ring-success",
      },
      inputSize: {
        default: "h-10",
        sm: "h-8 text-xs",
        lg: "h-12 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      inputSize: "default",
    },
  }
)

// ============================================
// Card Variants
// ============================================

export const cardVariants = cva(
  "rounded-xl border bg-surface-1 transition-all duration-200",
  {
    variants: {
      variant: {
        default: "border-border shadow-sm",
        elevated: "border-border shadow-lg",
        brand: "border-brand-primary/20 shadow-brand",
        interactive: "border-border hover:border-brand-primary/30 hover:shadow-brand cursor-pointer",
      },
      padding: {
        none: "p-0",
        sm: "p-4",
        default: "p-6",
        lg: "p-8",
      },
    },
    defaultVariants: {
      variant: "default",
      padding: "default",
    },
  }
)

// ============================================
// Badge Variants
// ============================================

export const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-brand-primary/10 text-brand-primary-light border border-brand-primary/20",
        secondary: "bg-surface-2 text-text-secondary border border-border",
        success: "bg-success/10 text-success border border-success/20",
        warning: "bg-warning/10 text-warning border border-warning/20",
        error: "bg-error/10 text-error border border-error/20",
        info: "bg-info/10 text-info border border-info/20",
        brand: "bg-gradient-to-r from-brand-primary/20 to-brand-secondary/20 text-brand-primary-light border border-brand-primary/20",
      },
      size: {
        default: "px-2.5 py-0.5 text-xs",
        sm: "px-2 py-0.5 text-2xs",
        lg: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

// ============================================
// Alert Variants
// ============================================

export const alertVariants = cva(
  "relative w-full rounded-lg border p-4 transition-all duration-200",
  {
    variants: {
      variant: {
        default: "bg-surface-1 border-border text-text-primary",
        info: "bg-info/10 border-info/30 text-info",
        success: "bg-success/10 border-success/30 text-success",
        warning: "bg-warning/10 border-warning/30 text-warning",
        error: "bg-error/10 border-error/30 text-error",
        brand: "bg-brand-primary/10 border-brand-primary/30 text-brand-primary-light",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

// ============================================
// Avatar Variants
// ============================================

export const avatarVariants = cva(
  "relative flex shrink-0 overflow-hidden rounded-full",
  {
    variants: {
      size: {
        sm: "h-8 w-8",
        default: "h-10 w-10",
        lg: "h-12 w-12",
        xl: "h-16 w-16",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

// ============================================
// Separator Variants
// ============================================

export const separatorVariants = cva(
  "shrink-0 bg-border",
  {
    variants: {
      orientation: {
        horizontal: "h-[1px] w-full",
        vertical: "h-full w-[1px]",
      },
      variant: {
        default: "bg-border",
        brand: "bg-gradient-to-r from-transparent via-brand-primary to-transparent",
        subtle: "bg-border/50",
      },
    },
    defaultVariants: {
      orientation: "horizontal",
      variant: "default",
    },
  }
)

// ============================================
// Tabs Variants
// ============================================

export const tabsListVariants = cva(
  "inline-flex items-center justify-center rounded-lg bg-surface-2 p-1",
  {
    variants: {
      variant: {
        default: "bg-surface-2",
        brand: "bg-brand-primary/10",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export const tabsTriggerVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "data-[state=active]:bg-surface-1 data-[state=active]:text-text-primary data-[state=active]:shadow-sm",
        brand: "data-[state=active]:bg-brand-primary data-[state=active]:text-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

// ============================================
// Tooltip Variants
// ============================================

export const tooltipVariants = cva(
  "z-50 overflow-hidden rounded-lg border px-3 py-1.5 text-sm shadow-md animate-in fade-in-0 zoom-in-95",
  {
    variants: {
      variant: {
        default: "bg-surface-1 border-border text-text-primary",
        brand: "bg-brand-primary text-white border-brand-primary-dark",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

// ============================================
// Spinner Variants
// ============================================

export const spinnerVariants = cva(
  "animate-spin rounded-full border-current border-t-transparent",
  {
    variants: {
      size: {
        sm: "h-4 w-4 border-2",
        default: "h-6 w-6 border-2",
        lg: "h-8 w-8 border-3",
        xl: "h-12 w-12 border-4",
      },
      variant: {
        default: "border-text-muted border-t-brand-primary",
        brand: "border-white/30 border-t-white",
      },
    },
    defaultVariants: {
      size: "default",
      variant: "default",
    },
  }
)

// ============================================
// Export Types
// ============================================

export type ButtonVariants = VariantProps<typeof buttonVariants>
export type InputVariants = VariantProps<typeof inputVariants>
export type CardVariants = VariantProps<typeof cardVariants>
export type BadgeVariants = VariantProps<typeof badgeVariants>
export type AlertVariants = VariantProps<typeof alertVariants>
export type AvatarVariants = VariantProps<typeof avatarVariants>
export type SeparatorVariants = VariantProps<typeof separatorVariants>
export type SpinnerVariants = VariantProps<typeof spinnerVariants>