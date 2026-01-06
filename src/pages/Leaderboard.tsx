"use client"

import React, { useState, useEffect } from "react"
import axios from "axios"

// Layout & Loader
import { Layout } from "../components/Layout"
import { Loader } from "../components/Loader"

// shadcn/ui components
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "../components/ui/card"
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
import { Button } from "../components/ui/button"
import { Badge } from "../components/ui/badge"

// lucide-react icons
import { QrCode, Eye } from "lucide-react"

// For generating QR codes
import QRCode from "react-qr-code"

// --------------------- Common Config URL ---------------------
const CONFIG_URL =
  "https://raw.githubusercontent.com/ResilientApp/l-store-config/refs/heads/main/milestones.json"

// Env-based constants
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "/api"
const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL || "http://localhost:5173"

interface LeaderboardEntry {
  name: string
  count: number
  total: number
  total_time: number
  tx_id?: string
}

export function Leaderboard() {
  // 1) Load milestone config from GitHub
  const [milestones, setMilestones] = useState<any[]>([])
  const [loadingConfig, setLoadingConfig] = useState(true)

  useEffect(() => {
    fetch(CONFIG_URL)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load milestones.json")
        return res.json()
      })
      .then((data) => {
        if (!data.milestones) throw new Error("Missing 'milestones' field")
        setMilestones(data.milestones)
        setLoadingConfig(false)
      })
      .catch((err) => {
        console.error("Error fetching milestone config:", err)
        setLoadingConfig(false)
      })
  }, [])

  // 2) Build the milestone dropdown items from the loaded config
  const enabledMilestones = milestones.filter((m) => m.enabled)

  // Flatten them: each "base" milestone plus an optional "extended" version
  const milestoneDropdownItems = enabledMilestones.flatMap((m: any) => {
    const items = [
      {
        value: m.id, // e.g. "milestone1"
        label: m.label, // e.g. "Milestone 1"
      },
    ]
    if (m.extendedEnabled) {
      items.push({
        value: `${m.id}_extended`, // e.g. "milestone1_extended"
        label: `${m.label} Extended`,
      })
    }
    return items
  })

  // 3) State for selected milestone
  const [milestone, setMilestone] = useState<string>(
    milestoneDropdownItems[0]?.value || ""
  )

  // 4) Leaderboard data
  const [data, setData] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(false)

  // 5) Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const rowsPerPage = 5
  const totalPages = Math.ceil(data.length / rowsPerPage)
  const startIndex = (currentPage - 1) * rowsPerPage
  const endIndex = startIndex + rowsPerPage
  const pageData = data.slice(startIndex, endIndex)

  // 6) QR code dialog
  const [qrOpen, setQrOpen] = useState(false)
  const [qrTarget, setQrTarget] = useState("")

  // 7) Once the config is loaded, set a default milestone if none selected
  useEffect(() => {
    if (milestoneDropdownItems.length > 0 && !milestone) {
      setMilestone(milestoneDropdownItems[0].value)
    }
  }, [milestoneDropdownItems, milestone])

  // 8) Fetch leaderboard whenever the milestone changes
  useEffect(() => {
    if (milestone) {
      fetchAndUpdateLeaderboard(milestone)
    }
  }, [milestone])

  async function fetchAndUpdateLeaderboard(ms: string) {
    try {
      setLoading(true)
      const response = await axios.get(`${BACKEND_URL}/leaderboard?milestone=${ms}`)
      const serverData = response.data
      if (Array.isArray(serverData)) {
        setData(serverData)
      } else {
        setData([])
      }
    } catch (err) {
      console.error("Error fetching leaderboard data:", err)
      setData([])
    } finally {
      setLoading(false)
    }
  }

  function handleNextPage() {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1)
  }
  function handlePrevPage() {
    if (currentPage > 1) setCurrentPage(currentPage - 1)
  }

  // 9) Open the QR code dialog
  function openQrCode(txId: string | undefined) {
    if (!txId) return
    // The full URL for results
    const resultsUrl = `${FRONTEND_URL}/results/${txId}`
    setQrTarget(resultsUrl)
    setQrOpen(true)
  }

  // If still loading config, show a simple message/loader
  if (loadingConfig) {
    return (
      <Layout>
        <div className="p-4 text-center">Loading milestones config...</div>
      </Layout>
    )
  }

  return (
    <Layout>
      <Loader show={loading} text="Loading leaderboard..." />

      <Card className="bg-neutral-900 text-neutral-100 border border-neutral-700 rounded shadow w-full">
        <CardHeader className="flex items-center justify-between w-full">
          <CardTitle className="text-lg text-white">Leaderboard</CardTitle>

          {/* The milestone dropdown */}
          <Select value={milestone} onValueChange={(val) => setMilestone(val)}>
            <SelectTrigger className="w-48 bg-neutral-800 text-white border border-neutral-700 text-sm">
              <SelectValue placeholder="Select Milestone" />
            </SelectTrigger>
            <SelectContent className="bg-neutral-800 border border-neutral-700 text-white">
              {milestoneDropdownItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>

        <CardContent className="overflow-x-auto">
          <table className="min-w-full text-sm border border-neutral-700">
            <thead className="bg-neutral-800 text-neutral-300">
              <tr>
                <th className="p-2 text-left border-b border-neutral-700 align-middle">
                  Rank
                </th>
                <th className="p-2 text-left border-b border-neutral-700 align-middle">
                  Submission Name
                </th>
                <th className="p-2 text-left border-b border-neutral-700 align-middle">
                  Test Cases Passed
                </th>
                <th className="p-2 text-left border-b border-neutral-700 align-middle">
                  Total Time
                </th>
                <th className="p-2 text-center border-b border-neutral-700 align-middle">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {pageData.map((entry, index) => {
                const rank = startIndex + index + 1
                return (
                  <tr
                    key={`${entry.name}-${index}`}
                    className="hover:bg-neutral-800"
                  >
                    <td className="p-2 border-b border-neutral-700 align-middle">
                      {rank}
                    </td>
                    <td className="p-2 border-b border-neutral-700 align-middle">
                      <Badge
                        variant="secondary"
                        className="bg-violet-600 text-white select-none"
                      >
                        {entry.name}
                      </Badge>
                    </td>
                    <td className="p-2 border-b border-neutral-700 align-middle">
                      {entry.count}/{entry.total}
                    </td>
                    <td className="p-2 border-b border-neutral-700 align-middle">
                      {entry.total_time} s
                    </td>
                    <td className="p-2 border-b border-neutral-700 align-middle">
                      <div className="flex justify-center items-center gap-4">
                        {/* QR Code button */}
                        {entry.tx_id && (
                          <button
                            onClick={() => openQrCode(entry.tx_id)}
                            className="hover:text-violet-500 transition-colors cursor-pointer"
                            title="Show QR code"
                          >
                            <QrCode className="inline-block h-5 w-5" />
                          </button>
                        )}

                        {/* Eye icon => open /results/<tx_id> in a NEW TAB */}
                        {entry.tx_id && (
                          <a
                            href={`/results/${entry.tx_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-violet-500 transition-colors cursor-pointer"
                            title="View results in new tab"
                          >
                            <Eye className="inline-block h-5 w-5" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}

              {pageData.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="text-center p-4 align-middle">
                    No data found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>

        <CardFooter className="flex items-center justify-between">
          <div className="text-sm">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              disabled={currentPage === 1}
              onClick={handlePrevPage}
              className="bg-neutral-800 text-neutral-100 hover:bg-neutral-700"
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              disabled={currentPage === totalPages || totalPages === 0}
              onClick={handleNextPage}
              className="bg-neutral-800 text-neutral-100 hover:bg-neutral-700"
            >
              Next
            </Button>
          </div>
        </CardFooter>
      </Card>

      {/* QR Code Modal */}
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="bg-neutral-900 border border-neutral-700 text-white sm:max-w-[400px]">
          <DialogHeader className="flex items-center justify-between">
            <DialogTitle className="text-white">Share Results</DialogTitle>
            <DialogClose asChild>
              {/* Possibly an X button or another close trigger */}
            </DialogClose>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center gap-4 mt-4">
            <p className="text-sm text-neutral-400">Scan this QR code to view:</p>
            <div className="bg-neutral-800 p-4">
              <QRCode
                value={qrTarget || ""}
                fgColor="#FFFFFF"
                bgColor="#202020"
                size={160}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}
