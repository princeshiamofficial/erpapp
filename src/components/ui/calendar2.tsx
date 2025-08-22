"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"
import { format } from "date-fns"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar2({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  
  const dayColors = [
    'text-red-500',      // Sunday
    'text-orange-500',   // Monday
    'text-amber-500',    // Tuesday
    'text-lime-600',     // Wednesday
    'text-sky-600',      // Thursday
    'text-indigo-500',   // Friday
    'text-purple-500',   // Saturday
  ];

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-3 flex flex-col flex-grow",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-base font-semibold",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse flex flex-col flex-grow",
        head_row: "flex",
        head_cell:
          "text-muted-foreground rounded-md w-full font-semibold text-xs shadow-sm", // Removed drop-shadow-sm for a cleaner look
        tbody: "flex-1 grid grid-cols-7 grid-rows-5 gap-px",
        row: "flex-1 contents",
        day_cell: 'p-0 relative',
        day: "h-full w-full",
      }}
      formatters={{
        formatWeekdayName: (day, options) => (
            <span className={cn('font-bold', dayColors[day.getDay()])}>
                {format(day, "EE", { locale: options?.locale })}
            </span>
        ),
      }}
      components={{
        IconLeft: ({ ...props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ...props }) => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  )
}
Calendar2.displayName = "Calendar"

export { Calendar2 }
