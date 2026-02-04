"use client"

import { useState, useEffect, useCallback, type ReactNode } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

export interface CommandItem {
  id: string
  icon: ReactNode
  label: string
  shortcut?: string
  onClick?: () => void
}

export interface CircularCommandMenuProps {
  items?: CommandItem[]
  trigger?: ReactNode
  className?: string
  radius?: number
  startAngle?: number
  spreadAngle?: number
  onSelect?: (item: CommandItem) => void
}

function CircularCommandMenu({
  items = [],
  trigger,
  className,
  radius = 120,
  startAngle = 0,
  spreadAngle = 90,
  onSelect,
}: CircularCommandMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  const safeItems = items || []
  const itemCount = safeItems.length

  // Cluster items within the spread angle, centered around startAngle
  const angleStep = itemCount > 1 ? spreadAngle / (itemCount - 1) : 0
  const startOffset = itemCount > 1 ? -spreadAngle / 2 : 0

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen || itemCount === 0) return

      switch (e.key) {
        case "ArrowRight":
        case "ArrowDown":
          e.preventDefault()
          setActiveIndex((prev) => (prev + 1) % itemCount)
          break
        case "ArrowLeft":
        case "ArrowUp":
          e.preventDefault()
          setActiveIndex((prev) => (prev - 1 + itemCount) % itemCount)
          break
        case "Enter":
          e.preventDefault()
          const selectedItem = safeItems[activeIndex]
          if (selectedItem) {
            selectedItem.onClick?.()
            onSelect?.(selectedItem)
          }
          setIsOpen(false)
          break
        case "Escape":
          e.preventDefault()
          setIsOpen(false)
          break
      }
    },
    [isOpen, activeIndex, safeItems, itemCount, onSelect],
  )

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  const getItemPosition = (index: number) => {
    const angle = ((startAngle + startOffset + index * angleStep) * Math.PI) / 180
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    }
  }

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      {/* Trigger */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "relative z-20 flex h-10 w-10 items-center justify-center rounded-full",
          "bg-white/10 backdrop-blur-xl border border-white/20 text-white shadow-xl",
          "hover:bg-brand-blue hover:scale-110 transition-all",
          "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background",
        )}
        whileTap={{ scale: 0.95 }}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <motion.span
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
        >
          {trigger}
        </motion.span>
      </motion.button>

      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-10 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Menu Items */}
      <AnimatePresence>
        {isOpen && itemCount > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            className="absolute z-30"
            role="menu"
          >
            {safeItems.map((item, index) => {
              const position = getItemPosition(index)
              const isActive = activeIndex === index

              return (
                <motion.button
                  key={item.id}
                  initial={{ 
                    opacity: 0, 
                    scale: 0,
                    x: position.x,
                    y: position.y,
                  }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    x: position.x,
                    y: position.y,
                  }}
                  exit={{ 
                    opacity: 0, 
                    scale: 0,
                    x: position.x,
                    y: position.y,
                  }}
                  transition={{
                    duration: 0.2,
                    delay: index * 0.03,
                    type: "spring",
                    stiffness: 500,
                    damping: 28,
                  }}
                  onClick={() => {
                    item.onClick?.()
                    onSelect?.(item)
                    setIsOpen(false)
                  }}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={cn(
                    "absolute flex h-11 w-11 items-center justify-center rounded-full",
                    "border border-white/20 bg-zinc-900/90 backdrop-blur-xl shadow-2xl",
                    "transition-colors duration-150 hover:bg-brand-blue",
                    isActive && "ring-2 ring-brand-blue bg-brand-blue",
                  )}
                  style={{ transform: `translate(-50%, -50%)` }}
                  role="menuitem"
                  aria-label={item.label}
                >
                  <span className="text-white">{item.icon}</span>

                  {/* Tooltip */}
                  <motion.span
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: isActive ? 1 : 0, y: isActive ? 0 : 4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-zinc-800 px-2 py-1 text-[10px] font-medium text-white shadow-lg pointer-events-none"
                  >
                    {item.label}
                  </motion.span>
                </motion.button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export { CircularCommandMenu }
