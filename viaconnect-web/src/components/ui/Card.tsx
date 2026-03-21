import { forwardRef } from "react";

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  hover?: boolean;
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className = "", hover = true, children, ...props }, ref) => (
    <div
      ref={ref}
      className={`rounded-xl ${hover ? "glass glass-hover" : "glass"} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
);
Card.displayName = "Card";
