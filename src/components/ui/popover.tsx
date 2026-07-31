"use client"

import * as React from "react"
import { Popover as PopoverPrimitive } from "@base-ui/react/popover"

import { cn } from "@/lib/utils"

function Popover({ ...props }: PopoverPrimitive.Root.Props) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />
}

function PopoverTrigger({ ...props }: PopoverPrimitive.Trigger.Props) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />
}

function PopoverPortal({ ...props }: PopoverPrimitive.Portal.Props) {
  return <PopoverPrimitive.Portal data-slot="popover-portal" {...props} />
}

function PopoverClose({ ...props }: PopoverPrimitive.Close.Props) {
  return <PopoverPrimitive.Close data-slot="popover-close" {...props} />
}

function PopoverPositioner({
  className,
  sideOffset = 8,
  ...props
}: PopoverPrimitive.Positioner.Props) {
  return (
    <PopoverPrimitive.Positioner
      data-slot="popover-positioner"
      sideOffset={sideOffset}
      className={cn("z-50 outline-none", className)}
      {...props}
    />
  )
}

function PopoverContent({
  className,
  align = "center",
  sideOffset = 8,
  children,
  ...props
}: PopoverPrimitive.Popup.Props & {
  align?: PopoverPrimitive.Positioner.Props["align"]
  sideOffset?: number
}) {
  return (
    <PopoverPortal>
      <PopoverPositioner align={align} sideOffset={sideOffset}>
        <PopoverPrimitive.Popup
          data-slot="popover-content"
          className={cn(
            "z-50 w-auto rounded-xl border bg-muted/95 p-3 shadow-2xl backdrop-blur outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            className
          )}
          {...props}
        >
          {children}
        </PopoverPrimitive.Popup>
      </PopoverPositioner>
    </PopoverPortal>
  )
}

export {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverClose,
  PopoverPortal,
  PopoverPositioner,
}
