
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarDays, ChevronDown } from "lucide-react";
import {
  format,
  subDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfYear,
  endOfYear,
  subYears,
  isSameDay,
  startOfDay, // Added
  endOfDay,   // Added
  getYear,    // Added
} from "date-fns";
import type { DateRange as RDPDateRange } from "react-day-picker";
export type DateRange = RDPDateRange;
import { cn } from "@/lib/utils";

export type PredefinedRange =
  | "today"
  | "yesterday"
  | "last7Days"
  | "last30Days"
  | "thisMonth"
  | "lastMonth"
  | "thisYear"
  | "lastYear";

interface DateRangePickerProps {
  initialRange?: DateRange;
  onDateRangeChange: (range: DateRange | undefined, displayLabel: string, predefinedValue: PredefinedRange | "custom" | null) => void;
  align?: "start" | "center" | "end";
  className?: string;
}

const PREDEFINED_RANGES_CONFIG: { label: string; value: PredefinedRange }[] = [
  { label: "Today", value: "today" },
  { label: "Yesterday", value: "yesterday" },
  { label: "Last 7 Days", value: "last7Days" },
  { label: "Last 30 Days", value: "last30Days" },
  { label: "This Month", value: "thisMonth" },
  { label: "Last Month", value: "lastMonth" },
  { label: "This Year", value: "thisYear" },
  { label: "Last Year", value: "lastYear" },
];

// Helper function to generate display label, can be outside component or memoized
const getDisplayLabel = (
  range: DateRange | undefined,
  predefinedValue: PredefinedRange | "custom" | null
): string => {
  if (predefinedValue === "custom") {
    if (range?.from) {
      if (range.to) {
        if (isSameDay(range.from, range.to)) {
          return format(range.from, "MMM d, yyyy");
        }
        if (getYear(range.from) !== getYear(range.to)) {
          return `${format(range.from, "MMM d, yyyy")} - ${format(range.to, "MMM d, yyyy")}`;
        }
        return `${format(range.from, "MMM d")} - ${format(range.to, "MMM d, yyyy")}`;
      }
      return `${format(range.from, "MMM d")} - Select end date`;
    }
    return "Custom Range";
  }
  return PREDEFINED_RANGES_CONFIG.find(r => r.value === predefinedValue)?.label || "Select Date Range";
};


export function DateRangePicker({
  initialRange,
  onDateRangeChange,
  align = "end",
  className,
}: DateRangePickerProps) {
  const defaultInitialRange: DateRange = {
    from: subDays(new Date(), 29),
    to: new Date(),
  };

  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>(
    initialRange || defaultInitialRange
  );
  const [selectedPredefined, setSelectedPredefined] = useState<PredefinedRange | "custom" | null>(
    () => {
      if (initialRange) {
        for (const range of PREDEFINED_RANGES_CONFIG) {
          const dates = getDateRangeForPredefined(range.value);
          if (dates.from && dates.to && initialRange.from && initialRange.to) {
            if (isSameDay(dates.from, initialRange.from) && isSameDay(dates.to, initialRange.to)) {
              return range.value;
            }
          }
        }
        return "custom";
      }
      return "last30Days";
    }
  );
  const [isCustomPopoverOpen, setIsCustomPopoverOpen] = useState(false);

  // This label is for the trigger button's display and updates reactively
  const triggerButtonDisplayLabel = useMemo(() => {
    return getDisplayLabel(selectedRange, selectedPredefined);
  }, [selectedRange, selectedPredefined]);

  function getDateRangeForPredefined(value: PredefinedRange): DateRange {
    const now = new Date();
    switch (value) {
      case "today":
        return { from: startOfDay(now), to: endOfDay(now) };
      case "yesterday":
        const yesterday = subDays(now, 1);
        return { from: startOfDay(yesterday), to: endOfDay(yesterday) };
      case "last7Days":
        return { from: subDays(now, 6), to: now };
      case "last30Days":
        return { from: subDays(now, 29), to: now };
      case "thisMonth":
        return { from: startOfMonth(now), to: endOfMonth(now) };
      case "lastMonth":
        const lastMonthStart = startOfMonth(subMonths(now, 1));
        const lastMonthEnd = endOfMonth(subMonths(now, 1));
        return { from: lastMonthStart, to: lastMonthEnd };
      case "thisYear":
        return { from: startOfYear(now), to: endOfYear(now) };
      case "lastYear":
        const lastYearStart = startOfYear(subYears(now, 1));
        const lastYearEnd = endOfYear(subYears(now, 1));
        return { from: lastYearStart, to: lastYearEnd };
      default:
        return { from: now, to: now };
    }
  }

  const handlePredefinedSelect = (value: PredefinedRange) => {
    const newRange = getDateRangeForPredefined(value);
    setSelectedPredefined(value);
    setSelectedRange(newRange);
    const newDisplayLabel = PREDEFINED_RANGES_CONFIG.find(r => r.value === value)?.label || "Error";
    onDateRangeChange(newRange, newDisplayLabel, value); // Notify parent immediately for predefined
    setIsCustomPopoverOpen(false); // Ensure custom popover is closed
  };

  const handleCustomDateSelectInCalendar = (range: DateRange | undefined) => {
    setSelectedRange(range);
    if (range?.from) {
      setSelectedPredefined("custom"); // Update internal state for label
    }
  };

  const handleApplyCustomRange = () => {
    setIsCustomPopoverOpen(false);
    let finalRange = selectedRange;
    if (selectedRange?.from && !selectedRange?.to) {
      finalRange = { from: selectedRange.from, to: selectedRange.from };
      setSelectedRange(finalRange);
    }
    const currentCustomDisplayLabel = getDisplayLabel(finalRange, "custom");
    onDateRangeChange(finalRange, currentCustomDisplayLabel, "custom");
  };


  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn("w-full justify-start text-left font-normal sm:w-auto h-9 sm:h-10", className)}
        >
          <CalendarDays className="mr-2 h-4 w-4" />
          <span className="truncate">{triggerButtonDisplayLabel}</span>
          <ChevronDown className="ml-auto h-4 w-4 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-56">
        <DropdownMenuLabel>Filter by Date</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {PREDEFINED_RANGES_CONFIG.map((range) => (
          <DropdownMenuItem
            key={range.value}
            onSelect={() => handlePredefinedSelect(range.value)}
            className={selectedPredefined === range.value ? "bg-accent text-accent-foreground" : ""}
          >
            {range.label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <Popover open={isCustomPopoverOpen} onOpenChange={setIsCustomPopoverOpen}>
          <PopoverTrigger asChild>
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                setSelectedPredefined("custom");
                setIsCustomPopoverOpen(true);
              }}
              className={selectedPredefined === "custom" ? "bg-accent text-accent-foreground" : ""}
            >
              Custom Range
            </DropdownMenuItem>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align={align === "center" ? "center" : "start"} side={align === "end" ? "left" : "right"} sideOffset={5}>
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={selectedRange?.from || new Date()}
              selected={selectedRange}
              onSelect={handleCustomDateSelectInCalendar}
              numberOfMonths={2}
            />
            <div className="p-3 border-t border-border flex justify-end">
              <Button
                size="sm"
                onClick={handleApplyCustomRange}
              >
                Apply
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
