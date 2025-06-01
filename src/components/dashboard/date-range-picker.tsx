
"use client";

import React, { useState, useEffect, useMemo } from "react";
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
} from "date-fns";
import type { DateRange } from "react-day-picker";

type PredefinedRange =
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
  onDateRangeChange: (range: DateRange | undefined) => void;
  align?: "start" | "center" | "end";
}

const PREDEFINED_RANGES: { label: string; value: PredefinedRange }[] = [
  { label: "Today", value: "today" },
  { label: "Yesterday", value: "yesterday" },
  { label: "Last 7 Days", value: "last7Days" },
  { label: "Last 30 Days", value: "last30Days" },
  { label: "This Month", value: "thisMonth" },
  { label: "Last Month", value: "lastMonth" },
  { label: "This Year", value: "thisYear" },
  { label: "Last Year", value: "lastYear" },
];

export function DateRangePicker({
  initialRange,
  onDateRangeChange,
  align = "end",
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
        for (const range of PREDEFINED_RANGES) {
          const dates = getDateRangeForPredefined(range.value);
          if (dates && initialRange.from && initialRange.to && isSameDay(dates.from, initialRange.from) && isSameDay(dates.to, initialRange.to)) {
            return range.value;
          }
        }
        return "custom";
      }
      return "last30Days";
    }
  );
  const [isCustomPopoverOpen, setIsCustomPopoverOpen] = useState(false);

  useEffect(() => {
    onDateRangeChange(selectedRange);
  }, [selectedRange, onDateRangeChange]);

  function getDateRangeForPredefined(value: PredefinedRange): DateRange {
    const now = new Date();
    switch (value) {
      case "today":
        return { from: now, to: now };
      case "yesterday":
        const yesterday = subDays(now, 1);
        return { from: yesterday, to: yesterday };
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
    setSelectedPredefined(value);
    setSelectedRange(getDateRangeForPredefined(value));
    setIsCustomPopoverOpen(false);
  };

  const handleCustomRangeSelect = (range: DateRange | undefined) => {
    if (range) {
      setSelectedRange(range);
      setSelectedPredefined("custom");
      // Keep popover open if only one date is selected
      if (range.from && range.to) {
        setIsCustomPopoverOpen(false);
      }
    }
  };
  
  const displayLabel = useMemo(() => {
    if (selectedPredefined === "custom") {
      if (selectedRange?.from && selectedRange?.to) {
        if (isSameDay(selectedRange.from, selectedRange.to)) {
          return format(selectedRange.from, "MMM d, yyyy");
        }
        return `${format(selectedRange.from, "MMM d")} - ${format(
          selectedRange.to,
          "MMM d, yyyy"
        )}`;
      }
      return "Custom Range";
    }
    return PREDEFINED_RANGES.find(r => r.value === selectedPredefined)?.label || "Select Date Range";
  }, [selectedRange, selectedPredefined]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-start text-left font-normal sm:w-auto h-9 sm:h-10"
        >
          <CalendarDays className="mr-2 h-4 w-4 text-primary/80" />
          <span className="truncate">{displayLabel}</span>
          <ChevronDown className="ml-auto h-4 w-4 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-56">
        <DropdownMenuLabel>Filter by Date</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {PREDEFINED_RANGES.map((range) => (
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
                e.preventDefault(); // Prevent DropdownMenu from closing
                setIsCustomPopoverOpen(true);
                setSelectedPredefined("custom"); // Indicate that custom is being configured
              }}
               className={selectedPredefined === "custom" ? "bg-accent text-accent-foreground" : ""}
            >
              Custom Range
            </DropdownMenuItem>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={selectedRange?.from}
              selected={selectedRange}
              onSelect={handleCustomRangeSelect}
              numberOfMonths={2}
            />
             <div className="p-3 border-t border-border flex justify-end">
                <Button
                  size="sm"
                  onClick={() => {
                    setIsCustomPopoverOpen(false);
                    // If no full range selected yet, revert to last valid predefined or default
                    if (!(selectedRange?.from && selectedRange?.to)) {
                        handlePredefinedSelect("last30Days"); 
                    }
                  }}
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
