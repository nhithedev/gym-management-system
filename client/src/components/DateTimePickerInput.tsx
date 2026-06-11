import { useEffect, useRef, useState } from 'react'
import { DayPicker } from 'react-day-picker'
import { Popover } from 'radix-ui'
import { Calendar, Clock3 } from 'lucide-react'
import { format, parse, isValid } from 'date-fns'
import { vi } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import 'react-day-picker/dist/style.css'

interface DateTimePickerInputProps {
  value: string // format: 'yyyy-MM-ddTHH:mm'
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  min?: string // 'yyyy-MM-dd' or 'yyyy-MM-ddTHH:mm' — only date part used for calendar constraint
  max?: string
  'aria-label'?: string
  className?: string
  minuteStep?: number
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export function DateTimePickerInput({
  value,
  onChange,
  placeholder = 'Chọn ngày & giờ',
  disabled = false,
  min,
  max,
  'aria-label': ariaLabel,
  className,
  minuteStep = 5,
}: DateTimePickerInputProps) {
  const [open, setOpen] = useState(false)
  const hourListRef = useRef<HTMLDivElement>(null)
  const minuteListRef = useRef<HTMLDivElement>(null)

  const [datePart, timePart] = value ? value.split('T') : ['', '']
  const parsedDate = datePart ? parse(datePart, 'yyyy-MM-dd', new Date()) : undefined
  const validDate = parsedDate && isValid(parsedDate) ? parsedDate : undefined

  const [hStr, mStr] = timePart ? timePart.split(':') : ['', '']
  const selectedHour = hStr ? parseInt(hStr, 10) : undefined
  const selectedMinute = mStr ? parseInt(mStr, 10) : undefined

  const hours = Array.from({ length: 24 }, (_, i) => i)
  const minutes = Array.from({ length: Math.ceil(60 / minuteStep) }, (_, i) => i * minuteStep)

  const fromDate = min ? parse(min.slice(0, 10), 'yyyy-MM-dd', new Date()) : undefined
  const toDate = max ? parse(max.slice(0, 10), 'yyyy-MM-dd', new Date()) : undefined

  useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => {
      if (hourListRef.current && selectedHour !== undefined) {
        const el = hourListRef.current.querySelector<HTMLElement>(`[data-h="${selectedHour}"]`)
        el?.scrollIntoView({ block: 'center', behavior: 'instant' })
      }
      if (minuteListRef.current && selectedMinute !== undefined) {
        const el = minuteListRef.current.querySelector<HTMLElement>(`[data-m="${selectedMinute}"]`)
        el?.scrollIntoView({ block: 'center', behavior: 'instant' })
      }
    }, 30)
    return () => clearTimeout(timer)
  }, [open, selectedHour, selectedMinute])

  function handleDateSelect(date: Date | undefined) {
    if (!date) return
    const d = format(date, 'yyyy-MM-dd')
    const h = selectedHour ?? 8
    const m = selectedMinute ?? 0
    onChange(`${d}T${pad(h)}:${pad(m)}`)
  }

  function handleHourSelect(h: number) {
    const d = validDate ? format(validDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
    const m = selectedMinute ?? 0
    onChange(`${d}T${pad(h)}:${pad(m)}`)
  }

  function handleMinuteSelect(m: number) {
    const d = validDate ? format(validDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
    const h = selectedHour ?? 8
    onChange(`${d}T${pad(h)}:${pad(m)}`)
  }

  const displayValue = validDate
    ? selectedHour !== undefined
      ? `${format(validDate, 'dd/MM/yyyy')} ${pad(selectedHour)}:${pad(selectedMinute ?? 0)}`
      : format(validDate, 'dd/MM/yyyy')
    : ''

  return (
    <Popover.Root open={open} onOpenChange={disabled ? undefined : setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={ariaLabel}
          className={cn(
            'rogym-input flex items-center justify-between gap-2 text-left',
            !displayValue && 'text-white/20',
            className
          )}
        >
          <span>{displayValue || placeholder}</span>
          <Calendar size={16} className="shrink-0 text-[var(--rogym-text-muted)]" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className={cn(
            'z-50 rounded-2xl border border-[var(--rogym-border-teal-dim)] p-3',
            'bg-[var(--rogym-bg-elevated)]',
            'shadow-[0_18px_48px_rgba(0,0,0,0.45)]'
          )}
        >
          <DayPicker
            mode="single"
            selected={validDate}
            onSelect={handleDateSelect}
            locale={vi}
            fromDate={fromDate}
            toDate={toDate}
            showOutsideDays
            classNames={{
              months: 'flex flex-col',
              month: 'space-y-3',
              caption: 'flex justify-center pt-1 relative items-center mb-1',
              caption_label: 'text-sm font-semibold text-white',
              nav: 'flex items-center',
              nav_button: cn(
                'absolute h-7 w-7 flex items-center justify-center rounded-lg',
                'text-[var(--rogym-text-muted)] hover:text-white hover:bg-white/10',
                'transition-colors'
              ),
              nav_button_previous: 'left-0',
              nav_button_next: 'right-0',
              table: 'w-full border-collapse',
              head_row: 'flex',
              head_cell: 'text-[var(--rogym-text-muted)] w-9 text-center text-xs font-normal pb-1',
              row: 'flex w-full mt-1',
              cell: 'h-9 w-9 text-center text-sm relative',
              day: cn(
                'h-9 w-9 p-0 font-normal rounded-xl',
                'text-[var(--rogym-text-secondary)]',
                'hover:bg-[var(--rogym-green)] hover:text-[var(--rogym-green-dark)]',
                'transition-colors'
              ),
              day_selected: cn(
                'bg-[var(--rogym-green)] text-[var(--rogym-green-dark)]',
                'font-semibold',
                'hover:bg-[var(--rogym-green-hover)]'
              ),
              day_today: 'border border-[var(--rogym-teal)] text-[var(--rogym-teal)] font-semibold',
              day_outside: 'text-white/20',
              day_disabled: 'text-white/15 cursor-not-allowed',
              day_hidden: 'invisible',
              nav_icon: 'h-4 w-4',
            }}
          />

          {/* Time picker */}
          <div className="mt-2 border-t border-white/10 pt-3">
            <div className="mb-2 flex items-center gap-1.5">
              <Clock3 size={13} className="text-[var(--rogym-text-muted)]" />
              <span className="text-xs font-medium text-[var(--rogym-text-secondary)]">
                Thời gian
              </span>
              {selectedHour !== undefined && (
                <span
                  className="ml-auto font-mono text-sm font-semibold rogym-sx-0a282bee"
                  
                >
                  {pad(selectedHour)}:{pad(selectedMinute ?? 0)}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Hour column */}
              <div
                ref={hourListRef}
                className="app-scrollbar h-36 w-12 overflow-y-auto rounded-xl border border-white/10 bg-white/[0.04] py-1"
              >
                {hours.map((h) => (
                  <button
                    key={h}
                    type="button"
                    data-h={h}
                    onClick={() => handleHourSelect(h)}
                    className={cn(
                      'flex h-8 w-full items-center justify-center rounded-lg font-mono text-sm transition-colors',
                      selectedHour === h
                        ? 'bg-[var(--rogym-green)] font-semibold text-[var(--rogym-green-dark)]'
                        : 'text-[var(--rogym-text-secondary)] hover:bg-white/10 hover:text-white'
                    )}
                  >
                    {pad(h)}
                  </button>
                ))}
              </div>

              <span className="text-base font-bold text-[var(--rogym-text-muted)]">:</span>

              {/* Minute column */}
              <div
                ref={minuteListRef}
                className="app-scrollbar h-36 w-12 overflow-y-auto rounded-xl border border-white/10 bg-white/[0.04] py-1"
              >
                {minutes.map((m) => (
                  <button
                    key={m}
                    type="button"
                    data-m={m}
                    onClick={() => handleMinuteSelect(m)}
                    className={cn(
                      'flex h-8 w-full items-center justify-center rounded-lg font-mono text-sm transition-colors',
                      selectedMinute === m
                        ? 'bg-[var(--rogym-green)] font-semibold text-[var(--rogym-green-dark)]'
                        : 'text-[var(--rogym-text-secondary)] hover:bg-white/10 hover:text-white'
                    )}
                  >
                    {pad(m)}
                  </button>
                ))}
              </div>

              <span className="text-xs text-[var(--rogym-text-muted)]">giờ</span>
            </div>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
