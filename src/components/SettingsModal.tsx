// src/components/SettingsModal.tsx

import React from "react"
import { useDispatch, useSelector } from "react-redux"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "../components/ui/dialog"
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "../components/ui/select"
import { RootState, AppDispatch } from "../app/store"
import { setTimeoutValue } from "../features/settingsSlice"
import { X } from "lucide-react"

/**
 * A modal that allows the user to pick a "timeout" from 2, 5, or 10 minutes.
 * Dark-themed, centered content, and uses an "X" icon to close.
 */
export function SettingsModal({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (val: boolean) => void
}) {
  const dispatch = useDispatch<AppDispatch>()
  const currentTimeout = useSelector((state: RootState) => state.settings.timeout)

  function handleSelectTimeout(value: string) {
    dispatch(setTimeoutValue(value))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* 
        You can optionally add `className` to <DialogContent> to
        control width, e.g. sm:max-w-[400px], or use default sizing.
      */}
      <DialogContent className="bg-neutral-900 border border-neutral-700 text-white sm:max-w-[400px]">
        <DialogHeader className="flex items-center justify-between">
          <DialogTitle className="text-white">Settings</DialogTitle>
          {/* Close icon in top-right */}
          <DialogClose asChild>
          </DialogClose>
        </DialogHeader>

        {/* Center all contents */}
        <div className="flex flex-col items-center justify-center gap-4 mt-4">
          <p className="text-sm text-neutral-400">
            Choose Timeout Duration
          </p>
          <Select value={currentTimeout} onValueChange={handleSelectTimeout}>
            <SelectTrigger className="w-48 bg-neutral-800 text-white border border-neutral-700">
              <SelectValue placeholder="Select Timeout" />
            </SelectTrigger>
            <SelectContent className="bg-neutral-800 border border-neutral-700 text-white">
              <SelectItem value="2">2 minutes</SelectItem>
              <SelectItem value="5">5 minutes</SelectItem>
              <SelectItem value="10">10 minutes</SelectItem>
              <SelectItem value="20">20 minutes</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </DialogContent>
    </Dialog>
  )
}
