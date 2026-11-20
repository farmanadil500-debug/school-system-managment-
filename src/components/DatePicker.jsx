import React, { useState, useRef, useEffect } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const DAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export default function DatePicker({ value, onChange, label = "Date" }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  // Parse initial selected date
  const selectedDate = value ? new Date(value + "T00:00:00") : new Date();
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth());

  // Close calendar when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  // Keep view aligned with selected date when value changes externally
  useEffect(() => {
    if (value) {
      const d = new Date(value + "T00:00:00");
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [value]);

  // Month navigation
  const prevMonth = (e) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = (e) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const setToday = (e) => {
    e.stopPropagation();
    const today = new Date();
    const iso = today.toISOString().slice(0, 10);
    onChange(iso);
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setOpen(false);
  };

  // Generate calendar days
  const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const handleSelectDay = (day) => {
    const mm = String(viewMonth + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    const isoDate = `${viewYear}-${mm}-${dd}`;
    onChange(isoDate);
    setOpen(false);
  };

  // Format display string
  const formatDisplay = (isoStr) => {
    if (!isoStr) return "Select date";
    const d = new Date(isoStr + "T00:00:00");
    if (isNaN(d.getTime())) return isoStr;
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div className="relative" ref={containerRef}>
      {label && <label className="label">{label}</label>}

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`input flex items-center justify-between text-left transition-all ${
          open ? "border-brand-500 ring-2 ring-brand-100" : ""
        }`}
      >
        <span className="flex items-center gap-2 font-medium text-slate-800">
          <CalendarIcon className="h-4 w-4 text-brand-600" />
          {formatDisplay(value)}
        </span>
        <span className="text-xs text-slate-400 font-mono">
          {value || "YYYY-MM-DD"}
        </span>
      </button>

      {/* Animated Dropdown Calendar */}
      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-72 rounded-2xl border border-slate-100 bg-white p-4 shadow-2xl animate-modal-in">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h4 className="font-bold text-slate-800 text-sm">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </h4>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={prevMonth}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                title="Previous Month"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={nextMonth}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                title="Next Month"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 gap-1 pt-3 text-center text-xs font-semibold text-slate-400">
            {DAY_NAMES.map((name) => (
              <div key={name} className="py-1">
                {name}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 pt-1">
            {/* Blank leading slots */}
            {Array.from({ length: firstDayIndex }).map((_, idx) => (
              <div key={`blank-${idx}`} className="h-8 w-8" />
            ))}

            {/* Month days */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const day = idx + 1;
              const mm = String(viewMonth + 1).padStart(2, "0");
              const dd = String(day).padStart(2, "0");
              const dayIso = `${viewYear}-${mm}-${dd}`;
              const isSelected = dayIso === value;
              const isToday = dayIso === todayStr;

              return (
                <button
                  type="button"
                  key={day}
                  onClick={() => handleSelectDay(day)}
                  className={`flex h-8 w-8 items-center justify-center rounded-xl text-xs font-medium transition-all ${
                    isSelected
                      ? "bg-brand-600 text-white font-bold shadow-md shadow-brand-200 scale-105"
                      : isToday
                      ? "border border-brand-300 text-brand-700 font-semibold hover:bg-brand-50"
                      : "text-slate-700 hover:bg-slate-100 hover:scale-105"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Footer Shortcuts */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-3 text-xs">
            <button
              type="button"
              onClick={setToday}
              className="font-semibold text-brand-600 hover:text-brand-700 transition"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-slate-500 hover:text-slate-700 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

