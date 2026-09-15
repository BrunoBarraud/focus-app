import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link"
    | "glow";
  size?: "default" | "sm" | "lg" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const variants = {
      default:
        "bg-zinc-100 text-zinc-900 shadow hover:bg-white hover:shadow-lg active:scale-[0.98]",
      destructive:
        "bg-rose-600/90 text-white shadow-sm hover:bg-rose-600 hover:shadow-rose-600/20 active:scale-[0.98]",
      outline:
        "border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-200 hover:text-white active:scale-[0.98]",
      secondary:
        "bg-zinc-800 text-zinc-100 hover:bg-zinc-700/80 active:scale-[0.98]",
      ghost:
        "hover:bg-zinc-800/60 text-zinc-400 hover:text-zinc-100 active:scale-[0.98]",
      link: "text-zinc-300 underline-offset-4 hover:underline",
      glow: "bg-violet-600 text-white font-semibold shadow-lg shadow-violet-600/30 hover:bg-violet-500 hover:shadow-violet-600/50 active:scale-[0.98] transition-all",
    };

    const sizes = {
      default: "h-9 px-4 py-2 text-sm",
      sm: "h-8 rounded-md px-3 text-xs",
      lg: "h-11 rounded-lg px-8 text-base",
      icon: "h-9 w-9 p-0 flex items-center justify-center",
    };

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
