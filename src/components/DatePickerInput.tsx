"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { Button, Input } from "@/components/ui";

function isoToDisplay(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "";
  return `${match[3]}/${match[2]}/${match[1]}`;
}

function displayToIso(value: string) {
  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return "";
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return "";
  }
  return `${match[3]}-${match[2]}-${match[1]}`;
}

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(date);
}

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

function startWeekday(year: number, month: number) {
  return new Date(Date.UTC(year, month, 1)).getUTCDay();
}

export function DatePickerInput({
  name,
  defaultValue = "",
  maxDate,
  required = false,
  disabled = false,
  className,
  onDateChange,
  ariaLabel
}: {
  name?: string;
  defaultValue?: string;
  maxDate?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  onDateChange?: (isoDate: string) => void;
  ariaLabel?: string;
}) {
  const initialMonth = useMemo(() => {
    const parsed = displayToIso(isoToDisplay(defaultValue)) || defaultValue;
    const date = parsed ? new Date(`${parsed}T00:00:00.000Z`) : new Date();
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  }, [defaultValue]);
  const [displayValue, setDisplayValue] = useState(isoToDisplay(defaultValue));
  const [visibleMonth, setVisibleMonth] = useState(initialMonth);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setDisplayValue(isoToDisplay(defaultValue));
    setVisibleMonth(initialMonth);
  }, [defaultValue, initialMonth]);

  const parsedIsoValue = displayToIso(displayValue);
  const isoValue = maxDate && parsedIsoValue > maxDate ? "" : parsedIsoValue;
  const year = visibleMonth.getUTCFullYear();
  const month = visibleMonth.getUTCMonth();
  const leadingBlanks = startWeekday(year, month);
  const monthDays = daysInMonth(year, month);

  function chooseDate(day: number) {
    if (disabled) return;
    const nextIso = [
      year,
      String(month + 1).padStart(2, "0"),
      String(day).padStart(2, "0")
    ].join("-");
    if (maxDate && nextIso > maxDate) return;
    setDisplayValue(isoToDisplay(nextIso));
    setOpen(false);
    onDateChange?.(nextIso);
  }

  function moveMonth(delta: number) {
    setVisibleMonth(new Date(Date.UTC(year, month + delta, 1)));
  }

  return (
    <div className="relative">
      <div className="flex gap-2">
        <Input
          aria-label={ariaLabel}
          value={displayValue}
          onChange={(event) => {
            if (disabled) return;
            setDisplayValue(event.target.value);
            const nextIso = displayToIso(event.target.value);
            onDateChange?.(maxDate && nextIso > maxDate ? "" : nextIso);
          }}
          placeholder="dd/mm/yyyy"
          pattern="\d{2}/\d{2}/\d{4}"
          required={required}
          disabled={disabled}
          className={className}
        />
        <Button type="button" variant="secondary" className="h-10 w-10 px-0" onClick={() => setOpen((current) => !current)} aria-label="Open calendar" disabled={disabled}>
          <Calendar size={16} />
        </Button>
      </div>
      {name ? <input type="hidden" name={name} value={isoValue} /> : null}

      {open ? (
        <div className="absolute z-40 mt-2 w-72 rounded-md border border-line bg-white p-3 shadow-xl">
          <div className="mb-3 flex items-center justify-between">
            <Button type="button" variant="secondary" className="h-8 w-8 px-0" onClick={() => moveMonth(-1)} aria-label="Previous month">
              <ChevronLeft size={15} />
            </Button>
            <div className="text-sm font-semibold">{monthLabel(visibleMonth)}</div>
            <Button type="button" variant="secondary" className="h-8 w-8 px-0" onClick={() => moveMonth(1)} aria-label="Next month">
              <ChevronRight size={15} />
            </Button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted">
            {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
              <div key={`${day}-${index}`} className="py-1">{day}</div>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {Array.from({ length: leadingBlanks }).map((_, index) => (
              <div key={`blank-${index}`} />
            ))}
            {Array.from({ length: monthDays }).map((_, index) => {
              const day = index + 1;
              const dayIso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const selected = dayIso === isoValue;
              const disabled = Boolean(maxDate && dayIso > maxDate);
              return (
                <Button
                  key={dayIso}
                  type="button"
                  variant={selected ? "primary" : "secondary"}
                  className="h-8 px-0 text-xs disabled:bg-[#f4f1eb] disabled:text-muted"
                  disabled={disabled}
                  onClick={() => chooseDate(day)}
                >
                  {day}
                </Button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
