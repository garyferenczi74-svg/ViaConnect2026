import React from 'react';

export type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info' | 'wellness';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
  children: React.ReactNode;
}

const badgeVariantClasses: Record<BadgeVariant, string> = {
  default: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
  primary: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
  success: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  error: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  info: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  wellness: 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300',
};

const dotColorClasses: Record<BadgeVariant, string> = {
  default: 'bg-slate-500',
  primary: 'bg-emerald-500',
  success: 'bg-green-500',
  warning: 'bg-amber-500',
  error: 'bg-red-500',
  info: 'bg-blue-500',
  wellness: 'bg-teal-500',
};

export function Badge({
  variant = 'default',
  dot = false,
  className = '',
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeVariantClasses[variant]} ${className}`}
      {...props}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dotColorClasses[variant]}`} />}
      {children}
    </span>
  );
}
