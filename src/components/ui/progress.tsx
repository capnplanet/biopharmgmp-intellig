import { ComponentProps } from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

function Progress({
  className,
  value,
  ...props
}: ComponentProps<typeof ProgressPrimitive.Root>) {
  const vRaw = Number(value ?? 0)
  const vClamped = Math.min(100, Math.max(0, vRaw))
  const v = parseFloat(vClamped.toFixed(2))
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        "bg-primary/20 relative h-2 w-full overflow-hidden rounded-full",
        className
      )}
      value={v}
      max={100}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={v}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="bg-primary h-full w-full flex-1 transition-all"
        style={{ transform: `translateX(-${(100 - v).toFixed(2)}%)` }}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
