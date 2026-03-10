import { cn } from "@/lib/utils";

type Variant = "green" | "yellow" | "red" | "blue" | "grey" | "purple";

const variants: Record<Variant, string> = {
  green:  "bg-green-100 text-green-800 border-green-200",
  yellow: "bg-yellow-100 text-yellow-800 border-yellow-200",
  red:    "bg-red-100 text-red-800 border-red-200",
  blue:   "bg-blue-100 text-blue-800 border-blue-200",
  grey:   "bg-gray-100 text-gray-600 border-gray-200",
  purple: "bg-purple-100 text-purple-800 border-purple-200",
};

export function Badge({
  label,
  variant = "grey",
  className,
}: {
  label: string;
  variant?: Variant;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
        variants[variant],
        className
      )}
    >
      {label}
    </span>
  );
}
