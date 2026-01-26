'use client'
import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { cn } from '@workspace/ui/lib/utils'
import { useEffect, useState } from 'react'
const options = [
  { value: 'system' as const, icon: Monitor, label: 'System' },
  { value: 'light' as const, icon: Sun, label: 'Light' },
  { value: 'dark' as const, icon: Moon, label: 'Dark' }
]
const ThemeToggle = () => {
  const { setTheme, theme } = useTheme()
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return (
      <div className="inline-flex items-center gap-1 p-1 rounded-full bg-muted/50 border border-border">
        {options.map(({ value, icon: Icon, label }) => (
          <button
            key={value}
            className="p-2 rounded-full transition-all duration-200 text-muted-foreground"
            aria-label={label}
            disabled
          >
            <Icon className="w-4 h-4" />
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="inline-flex items-center gap-1 p-1 rounded-full bg-muted/50 border border-border">
      {options.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={cn(
            'p-2 rounded-full transition-all duration-200',
            theme === value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
          aria-label={label}
        >
          <Icon className="w-4 h-4" />
        </button>
      ))}
    </div>
  )
}

export default ThemeToggle
