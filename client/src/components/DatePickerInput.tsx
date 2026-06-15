import { useEffect, useState } from 'react'
import { DayPicker } from 'react-day-picker'
import { Popover } from 'radix-ui'
import { Calendar } from 'lucide-react'
import { format, parse, isValid, isAfter, isBefore } from 'date-fns'
import { vi } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import 'react-day-picker/dist/style.css'

interface DatePickerInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  min?: string
  max?: string
  'aria-label'?: string
  required?: boolean
  className?: string
}

function tryParseUserInput(text: string): Date | null {
  for (const fmt of ['dd/MM/yyyy', 'd/M/yyyy', 'dd-MM-yyyy', 'dd/MM/yy']) {
    const d = parse(text, fmt, new Date())
    if (isValid(d)) return d
  }
  return null
}

export function DatePickerInput({
  value,
  onChange,
  placeholder = 'DD/MM/YYYY',
  disabled = false,
  min,
  max,
  'aria-label': ariaLabel,
  className,
}: DatePickerInputProps) {
  const [open, setOpen] = useState(false)
  const [focused, setFocused] = useState(false)
  const [inputText, setInputText] = useState('')

  const selected = value ? parse(value, 'yyyy-MM-dd', new Date()) : undefined
  const validSelected = selected && isValid(selected) ? selected : undefined

  const fromDate = min ? parse(min, 'yyyy-MM-dd', new Date()) : undefined
  const toDate = max ? parse(max, 'yyyy-MM-dd', new Date()) : undefined

  // Sync display text from external value when not actively typing
  useEffect(() => {
    if (!focused) {
      setInputText(validSelected ? format(validSelected, 'dd/MM/yyyy') : '')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  function handleSelect(date: Date | undefined) {
    if (!date) return
    onChange(format(date, 'yyyy-MM-dd'))
    setOpen(false)
  }

  function handleTextChange(e: React.ChangeEvent<HTMLInputElement>) {
    const text = e.target.value
    setInputText(text)

    if (text === '') {
      onChange('')
      return
    }

    const parsed = tryParseUserInput(text)
    if (parsed) {
      if (fromDate && isBefore(parsed, fromDate)) return
      if (toDate && isAfter(parsed, toDate)) return
      onChange(format(parsed, 'yyyy-MM-dd'))
    }
  }

  function handleFocus() {
    setFocused(true)
  }

  function handleBlur() {
    setFocused(false)
    // Normalize to canonical display format, or clear if input can't be parsed
    setInputText(validSelected ? format(validSelected, 'dd/MM/yyyy') : '')
  }

  const displayText = focused ? inputText : (validSelected ? format(validSelected, 'dd/MM/yyyy') : '')

  return (
    <Popover.Root open={open} onOpenChange={disabled ? undefined : setOpen}>
      <Popover.Anchor asChild>
        <div className={cn('relative', className)}>
          <input
            type="text"
            disabled={disabled}
            aria-label={ariaLabel}
            value={displayText}
            onChange={handleTextChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            className={cn(
              'rogym-input pr-10',
              !displayText && 'placeholder:text-white/20'
            )}
          />
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            onClick={() => setOpen(!open)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rogym-text-muted hover:text-white transition-colors"
            aria-label="Mở lịch"
          >
            <Calendar size={16} className="shrink-0" />
          </button>
        </div>
      </Popover.Anchor>
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
            selected={validSelected}
            onSelect={handleSelect}
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
                'rogym-text-muted hover:text-white hover:bg-white/10',
                'transition-colors'
              ),
              nav_button_previous: 'left-0',
              nav_button_next: 'right-0',
              table: 'w-full border-collapse',
              head_row: 'flex',
              head_cell: 'rogym-text-muted w-9 text-center text-xs font-normal pb-1',
              row: 'flex w-full mt-1',
              cell: 'h-9 w-9 text-center text-sm relative',
              day: cn(
                'h-9 w-9 p-0 font-normal rounded-xl',
                'rogym-text-secondary',
                'hover:bg-[var(--rogym-green)] hover:rogym-text-green-dark',
                'transition-colors'
              ),
              day_selected: cn(
                'bg-[var(--rogym-green)] rogym-text-green-dark',
                'font-semibold',
                'hover:bg-[var(--rogym-green-hover)]'
              ),
              day_today: 'border border-[var(--rogym-teal)] rogym-text-accent font-semibold',
              day_outside: 'text-white/20',
              day_disabled: 'text-white/15 cursor-not-allowed',
              day_hidden: 'invisible',
              nav_icon: 'h-4 w-4',
            }}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
