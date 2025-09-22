
"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"
import { format } from "date-fns"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar3({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-4 sm:p-6 rounded-2xl bg-background shadow-sm", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-6",
        month: "space-y-3",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-lg font-semibold",
        nav: "flex items-center gap-2",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-transparent p-0 opacity-60 hover:opacity-100 transition"
        ),
        nav_button_previous: "absolute left-1 sm:left-2",
        nav_button_next: "absolute right-1 sm:right-2",
        table: "w-full border-collapse",
        head_row: "flex",
        head_cell:
          "text-muted-foreground rounded-md flex-1 font-medium text-[0.8rem] sm:text-sm text-center",
        row: "flex w-full mt-1 sm:mt-2",
        cell: "flex-1 aspect-square relative text-center text-sm p-0 focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-full w-full flex items-center justify-center font-normal rounded-full transition aria-selected:opacity-100"
        ),
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today:
          "bg-accent text-accent-foreground font-semibold",
        day_outside: "text-muted-foreground opacity-40",
        day_disabled: "text-muted-foreground opacity-30 cursor-not-allowed",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      formatters={{
        formatWeekdayName: (day, options) => {
          const isFriday = day.getDay() === 5
          const dayColorClass = isFriday ? "text-destructive" : "text-foreground"
          return (
            <span className={cn("font-semibold", dayColorClass)}>
              {format(day, "EE", { locale: options?.locale })}
            </span>
          )
        },
      }}
      components={{
        IconLeft: () => <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />,
        IconRight: () => <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />,
      }}
      {...props}
    />
  )
}

Calendar3.displayName = "Calendar3"
export { Calendar3 }
