import { cn } from "@/utils/cn";

type BrandLogoProps = {
  compact?: boolean;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
};

export function BrandLogo({
  compact = false,
  className,
  imageClassName,
  priority = false,
}: BrandLogoProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md border border-red-200/30 bg-white",
        compact ? "h-12 w-12" : "h-28 w-28",
        className,
      )}
    >
      <img
        src={compact ? "/brand/connecta-mark.svg" : "/brand/connecta-logo.svg"}
        alt="CONNECTA TELECOM"
        className={cn("h-full w-full object-contain p-1", imageClassName)}
        loading={priority ? "eager" : "lazy"}
      />
    </div>
  );
}
