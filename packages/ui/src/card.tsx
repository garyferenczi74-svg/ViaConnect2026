import React from 'react';

export type CardVariant = 'elevated' | 'interactive' | 'flat' | 'glass';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: CardPadding;
  children: React.ReactNode;
}

const cardVariantClasses: Record<CardVariant, string> = {
  elevated:
    'bg-white shadow-lg dark:bg-slate-800 border border-slate-200 dark:border-slate-700',
  interactive:
    'bg-white shadow-md hover:shadow-lg transition-shadow cursor-pointer dark:bg-slate-800 border border-slate-200 dark:border-slate-700',
  flat:
    'bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700',
  glass:
    'glass-card',
};

const paddingClasses: Record<CardPadding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-8',
};

export function Card({
  variant = 'elevated',
  padding = 'md',
  className = '',
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={`rounded-xl ${cardVariantClasses[variant]} ${paddingClasses[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`mb-4 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className = '', children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={`text-lg font-semibold text-slate-900 dark:text-slate-100 ${className}`} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ className = '', children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={`text-sm text-slate-500 dark:text-slate-400 ${className}`} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={className} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`mt-4 flex items-center ${className}`} {...props}>
      {children}
    </div>
  );
}
