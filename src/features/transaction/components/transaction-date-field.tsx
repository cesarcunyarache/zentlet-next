"use client";

import { useState } from "react";
import { Calendar, DateField, DatePicker, I18nProvider } from "@heroui/react";
import { getLocalTimeZone, parseDate, today } from "@internationalized/date";
import { X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { intlLocales } from "@/i18n/routing";
import { PillSelect } from "@/core/components/ui/pill-select";
import { dayLabel, dayShift, toISODate } from "../lib/format";

const CUSTOM = "custom";
const RECENT_DAYS = 7;

interface TransactionDateFieldProps {
  /** Fecha ISO (`2026-09-23`). */
  value: string;
  onChange: (isoDate: string) => void;
}

/**
 * Los últimos días a un toque; "Otra fecha…" cambia a un selector con
 * calendario para cualquier día anterior.
 */
export function TransactionDateField({ value, onChange }: TransactionDateFieldProps) {
  const t = useTranslations("transactions");
  const locale = useLocale();
  const [isCustom, setIsCustom] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // se recalcula en cada render: si la app quedó abierta de un día para
  // otro, "Hoy" tiene que seguir siendo hoy
  const recentDays = Array.from({ length: RECENT_DAYS }, (_, offset) => toISODate(dayShift(offset)));
  const showCalendarField = isCustom || !recentDays.includes(value);

  function pickRecent(next: string) {
    if (next !== CUSTOM) return onChange(next);
    setIsCustom(true);
    setIsCalendarOpen(true);
  }

  function backToRecent() {
    setIsCustom(false);
    onChange(recentDays[0]);
  }

  if (!showCalendarField) {
    return (
      <PillSelect
        label={t("fields.date")}
        value={value}
        options={[
          ...recentDays.map((date) => ({ value: date, label: dayLabel(date, locale) })),
          { value: CUSTOM, label: t("date.other") },
        ]}
        onChange={pickRecent}
        className="bg-app-fill min-h-9 px-3"
      />
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <I18nProvider locale={intlLocales[locale]}>
        <DatePicker
          aria-label={t("fields.date")}
          value={parseDate(value)}
          maxValue={today(getLocalTimeZone())}
          onChange={(date) => date && onChange(date.toString())}
          isOpen={isCalendarOpen}
          onOpenChange={setIsCalendarOpen}
          className="w-fit"
        >
          <DateField.Group className="bg-app-fill text-app-fg min-h-9 rounded-full border-0 pr-1 pl-3 text-[13px] font-semibold shadow-none">
            <DateField.Input>{(segment) => <DateField.Segment segment={segment} />}</DateField.Input>
            <DateField.Suffix>
              <DatePicker.Trigger>
                <DatePicker.TriggerIndicator />
              </DatePicker.Trigger>
            </DateField.Suffix>
          </DateField.Group>
          <DatePicker.Popover>
            <Calendar aria-label={t("date.calendar")}>
              <Calendar.Header>
                <Calendar.YearPickerTrigger>
                  <Calendar.YearPickerTriggerHeading />
                  <Calendar.YearPickerTriggerIndicator />
                </Calendar.YearPickerTrigger>
                <Calendar.NavButton slot="previous" />
                <Calendar.NavButton slot="next" />
              </Calendar.Header>
              <Calendar.Grid>
                <Calendar.GridHeader>
                  {(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}
                </Calendar.GridHeader>
                <Calendar.GridBody>{(date) => <Calendar.Cell date={date} />}</Calendar.GridBody>
              </Calendar.Grid>
              <Calendar.YearPickerGrid>
                <Calendar.YearPickerGridBody>
                  {({ year }) => <Calendar.YearPickerCell year={year} />}
                </Calendar.YearPickerGridBody>
              </Calendar.YearPickerGrid>
            </Calendar>
          </DatePicker.Popover>
        </DatePicker>
      </I18nProvider>
      <button
        type="button"
        aria-label={t("date.backToRecent")}
        onClick={backToRecent}
        className="text-app-muted hover:bg-app-fill hover:text-app-fg grid size-8 place-items-center rounded-full transition-colors"
      >
        <X className="size-3.5" strokeWidth={2.2} />
      </button>
    </div>
  );
}
