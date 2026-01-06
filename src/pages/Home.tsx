"use client"

import React, { useState, useRef, useEffect, FormEvent } from "react"
import axios from "axios"
import { useNavigate } from "react-router-dom"

// Layout & Loader
import { Layout } from "../components/Layout"
import { Loader } from "../components/Loader"

// shadcn/ui components
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter
} from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Switch } from "../components/ui/switch"
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue
} from "../components/ui/select"
import { Input } from "../components/ui/input"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent
} from "../components/ui/tooltip"
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent
} from "../components/ui/tabs"
import { ScrollArea } from "../components/ui/scroll-area" // If you still use it

// Redux
import { useSelector } from "react-redux"
import { RootState } from "../app/store"

// Icons
import { Github, FilePlus, Play } from "lucide-react"

// --------------------- Common Config URL ---------------------
const CONFIG_URL =
  "https://raw.githubusercontent.com/ResilientApp/l-store-config/refs/heads/main/milestones.json"

// We'll still reference the same BACKEND_URL from your .env
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "/api"

// ====================== HELPER FUNCTIONS ======================
function trackSubmission() {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  const dayString = date.toISOString().slice(0, 10)
  const existing = localStorage.getItem("lstore_submissions")
  let data: string[] = existing ? JSON.parse(existing) : []
  if (!data.includes(dayString)) {
    data.push(dayString)
    localStorage.setItem("lstore_submissions", JSON.stringify(data))
  }
}

function generateYearDates(year: number) {
  const startOfYear = new Date(year, 0, 1)
  const offset = startOfYear.getDay()
  const firstSunday = new Date(startOfYear)
  firstSunday.setDate(startOfYear.getDate() - offset)
  const columns = []
  const current = new Date(firstSunday)
  for (let col = 0; col < 53; col++) {
    const columnDays = []
    for (let row = 0; row < 7; row++) {
      const cellDate = new Date(current)
      if (cellDate.getFullYear() === year) {
        columnDays.push(cellDate)
      } else {
        columnDays.push(null)
      }
      current.setDate(current.getDate() + 1)
    }
    columns.push(columnDays)
  }
  return columns
}

function milestoneAllowsExtended(msId: string, milestones: any[]) {
  const found = milestones.find((m: any) => m.id === msId)
  return found?.extendedEnabled ?? false
}

// ====================== HOME COMPONENT ======================
export function Home() {
  // 1) Load Milestone Config from GitHub
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

  // 2) Filter out only the enabled milestones once loaded
  const enabledMilestones = milestones.filter((m) => m.enabled)

  // 3) Redux-based toggles for AI and Timeout
  const aiMode = useSelector((state: RootState) => state.settings.aiMode)
  const timeout = useSelector((state: RootState) => state.settings.timeout)

  useEffect(() => {
    console.log("AI Mode changed to:", aiMode)
    console.log("Timeout changed to:", timeout, "minutes")
  }, [aiMode, timeout])

  // 4) React Router navigate
  const navigate = useNavigate()

  // 5) States for Card #1 (GitHub)
  const [milestone1, setMilestone1] = useState("")
  const [extended1, setExtended1] = useState(false)
  const [repoUrl, setRepoUrl] = useState("")

  // 6) States for Card #2 (File Upload)
  const [milestone2, setMilestone2] = useState("")
  const [extended2, setExtended2] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [fileName, setFileName] = useState("")
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // 7) Loader & Submissions states
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [showLoader, setShowLoader] = useState(false)
  const [submissions, setSubmissions] = useState<Set<string>>(new Set())

  // Load prior submissions from localStorage
  useEffect(() => {
    const existing = localStorage.getItem("lstore_submissions")
    if (existing) {
      const arr: string[] = JSON.parse(existing)
      setSubmissions(new Set(arr))
    }
  }, [])

  function reloadSubmissions() {
    const existing = localStorage.getItem("lstore_submissions")
    if (existing) {
      const arr: string[] = JSON.parse(existing)
      setSubmissions(new Set(arr))
    }
  }

  // 8) Initialize milestone1/milestone2 defaults once config is loaded
  //    (only if not set yet)
  useEffect(() => {
    if (enabledMilestones.length > 0) {
      setMilestone1((prev) => (prev ? prev : enabledMilestones[0].id))
      setMilestone2((prev) => (prev ? prev : enabledMilestones[0].id))
    }
  }, [enabledMilestones])

  // 9) Evaluate Card #1 (GitHub)
  async function onEvaluateCard1(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!repoUrl) {
      alert("Please enter a GitHub repository URL.")
      return
    }
    setShowLoader(true)
    const formData = new FormData()
    formData.append("milestone", milestone1)
    formData.append("extended", extended1 ? "true" : "false")
    formData.append("github_repo", repoUrl)
    formData.append("ai", aiMode ? "true" : "false")
    if (timeout) formData.append("timeout", timeout.toString())

    try {
      const response = await axios.post(`${BACKEND_URL}/results`, formData)
      const data = response.data
      console.log("Evaluation response:", data)
      trackSubmission()
      reloadSubmissions()

      const tx_id = data.resilientdb_tx_id || "unknown"
      navigate(`/results/${tx_id}`)
    } catch (err) {
      console.error("Evaluation error:", err)
    } finally {
      setShowLoader(false)
    }
  }

  // 10) Evaluate Card #2 (File Upload)
  async function onEvaluateCard2(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!file) {
      alert("Please select a file to upload.")
      return
    }
    setIsUploading(true)
    setProgress(0)
    setShowLoader(true)

    const formData = new FormData()
    formData.append("file", file)
    formData.append("milestone", milestone2)
    formData.append("extended", extended2 ? "true" : "false")
    formData.append("ai", aiMode ? "true" : "false")
    if (timeout) formData.append("timeout", timeout.toString())

    try {
      const response = await axios.post(`${BACKEND_URL}/results`, formData, {
        onUploadProgress: (p) => {
          if (p.total) {
            const pc = Math.round((p.loaded * 100) / p.total)
            setProgress(pc)
          }
        }
      })
      const data = response.data
      console.log("Evaluation response:", data)
      setIsUploading(false)
      trackSubmission()
      reloadSubmissions()

      const tx_id = data.resilientdb_tx_id || "unknown"
      navigate(`/results/${tx_id}`)
    } catch (err) {
      console.error("Upload error:", err)
      setIsUploading(false)
    } finally {
      setShowLoader(false)
    }
  }

  // 11) Contribution Graph
  const [selectedYear, setSelectedYear] = useState("2025")

  function isSubmissionDay(date: Date | null) {
    if (!date) return false
    const dayString = date.toISOString().slice(0, 10)
    return submissions.has(dayString)
  }

  function renderContribCell(date: Date | null, colIndex: number, rowIndex: number) {
    if (!date) {
      return (
        <div
          key={`c${colIndex}-r${rowIndex}`}
          className="h-3 w-3 bg-neutral-800 rounded"
        />
      )
    }
    const dayString = date.toISOString().slice(0, 10)
    const isSub = isSubmissionDay(date)
    const cellColor = isSub ? "bg-violet-600" : "bg-neutral-700"
    return (
      <Tooltip key={`c${colIndex}-r${rowIndex}`}>
        <TooltipTrigger asChild>
          <div
            className={`h-3 w-3 rounded cursor-pointer transition-colors duration-150 ${cellColor} hover:opacity-80`}
          />
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">
            {dayString} – {isSub ? "Evaluated" : "No Evaluation"}
          </p>
        </TooltipContent>
      </Tooltip>
    )
  }

  function renderContributionGraph(year: string) {
    const columns = generateYearDates(parseInt(year, 10))
    return (
      <div className="flex gap-1">
        {columns.map((week, colIndex) => (
          <div key={`col-${colIndex}`} className="flex flex-col gap-1">
            {week.map((date, rowIndex) =>
              renderContribCell(date, colIndex, rowIndex)
            )}
          </div>
        ))}
      </div>
    )
  }

  // ====================== RETURN ======================
  return (
    <Layout>
      {/* 1) Show loader if something is in progress */}
      <Loader show={showLoader} text="Evaluating..." />

      {/* 2) If still loading config, show a placeholder */}
      {loadingConfig ? (
        <div className="p-4 text-center">Loading milestones config...</div>
      ) : (
        <>
          {/* 3) Main content once config is loaded */}
          <div className="flex flex-col gap-6">
            <div className="flex flex-col items-stretch gap-6 md:flex-row">
              {/* Card #1: GitHub */}
              <form onSubmit={onEvaluateCard1} className="flex-1">
                <Card className="bg-neutral-900 text-neutral-100 border border-neutral-700 rounded shadow flex flex-col h-full">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg text-white">
                      <Github className="h-5 w-5 text-neutral-400" />
                      Provide GitHub Repository URL
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <p className="text-sm text-neutral-400 mb-3">
                      Enter your GitHub repo URL (optional).
                    </p>
                    <Input
                      type="url"
                      placeholder="https://github.com/username/repo"
                      value={repoUrl}
                      onChange={(e) => setRepoUrl(e.target.value)}
                      className="bg-neutral-800 text-white"
                    />
                  </CardContent>
                  <CardFooter className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={extended1}
                          onCheckedChange={(val) => setExtended1(Boolean(val))}
                          disabled={!milestoneAllowsExtended(milestone1, milestones)}
                          className="h-6 w-11 shrink-0 rounded-full border-2 border-transparent relative data-[state=unchecked]:bg-gray-600 data-[state=checked]:bg-violet-600 transition-colors duration-200 ease-in-out focus:outline-none"
                        />
                        <span className="text-sm">Extended</span>
                      </div>
                      <Select
                        value={milestone1}
                        onValueChange={(val) => {
                          setMilestone1(val)
                          if (!milestoneAllowsExtended(val, milestones)) {
                            setExtended1(false)
                          }
                        }}
                      >
                        <SelectTrigger className="w-36 bg-neutral-800 border border-neutral-700 text-neutral-100 text-sm">
                          <SelectValue placeholder="Milestone" />
                        </SelectTrigger>
                        <SelectContent className="bg-neutral-900 text-neutral-100 border border-neutral-700 text-sm">
                          {enabledMilestones.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="submit"
                      className="bg-violet-600 text-white hover:bg-violet-700 flex items-center gap-2 text-sm"
                    >
                      <Play className="h-4 w-4" />
                      Evaluate
                    </Button>
                  </CardFooter>
                  {!extended1 && (
                    <div className="border-t border-neutral-700 p-3 text-sm text-gray-400">
                      This is a sample/sanity test. It is not a comprehensive set of test cases for the final evaluation.
                    </div>
                  )}
                </Card>
              </form>

              {/* Card #2: File Upload */}
              <form onSubmit={onEvaluateCard2} className="flex-1">
                <Card className="bg-neutral-900 text-neutral-100 border border-neutral-700 rounded shadow flex flex-col h-full">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg text-white">
                      <FilePlus className="h-5 w-5 text-neutral-400" />
                      Upload your .zip
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <div
                      className="mt-2 flex flex-col items-center justify-center border-2 border-dashed border-neutral-700 rounded-lg p-6 cursor-pointer hover:bg-neutral-800"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <FilePlus className="mb-2 h-10 w-10 text-neutral-500" />
                      <p className="text-center text-sm text-neutral-400">
                        {fileName
                          ? `File uploaded: ${fileName}`
                          : "Drag your .zip here or click to browse"}
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        name="file"
                        accept=".zip"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            setFile(e.target.files[0])
                            setFileName(e.target.files[0].name)
                          }
                        }}
                      />
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={extended2}
                          onCheckedChange={(val) => setExtended2(Boolean(val))}
                          disabled={!milestoneAllowsExtended(milestone2, milestones)}
                          className="h-6 w-11 shrink-0 rounded-full border-2 border-transparent relative data-[state=unchecked]:bg-gray-600 data-[state=checked]:bg-violet-600 transition-colors duration-200 ease-in-out focus:outline-none"
                        />
                        <span className="text-sm">Extended</span>
                      </div>
                      <Select
                        value={milestone2}
                        onValueChange={(val) => {
                          setMilestone2(val)
                          if (!milestoneAllowsExtended(val, milestones)) {
                            setExtended2(false)
                          }
                        }}
                      >
                        <SelectTrigger className="w-36 bg-neutral-800 border border-neutral-700 text-neutral-100 text-sm">
                          <SelectValue placeholder="Milestone" />
                        </SelectTrigger>
                        <SelectContent className="bg-neutral-900 text-neutral-100 border border-neutral-700 text-sm">
                          {enabledMilestones.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="submit"
                      disabled={isUploading}
                      className="bg-violet-600 text-white hover:bg-violet-700 flex items-center gap-2 text-sm"
                    >
                      <Play className="h-4 w-4" />
                      Evaluate
                    </Button>
                  </CardFooter>
                  {!extended2 && (
                    <div className="border-t border-neutral-700 p-3 text-sm text-gray-400">
                      This is a sample/sanity test. It is not a comprehensive set of test cases for the final evaluation.
                    </div>
                  )}
                </Card>
              </form>
            </div>

            {/* Contribution Graph */}
            <Tabs
              value={selectedYear}
              onValueChange={setSelectedYear}
              className="w-full mt-6"
            >
              <Card className="bg-neutral-900 text-neutral-100 border border-neutral-700 rounded shadow w-full">
                <CardHeader className="flex items-center justify-between w-full">
                  <CardTitle className="text-lg text-white">
                    Evaluation Graph
                  </CardTitle>
                  <TabsList className="bg-neutral-800 border border-neutral-700 text-sm rounded">
                    <TabsTrigger
                      value="2024"
                      className="data-[state=active]:bg-violet-600 data-[state=active]:text-white"
                    >
                      2024
                    </TabsTrigger>
                    <TabsTrigger
                      value="2025"
                      className="data-[state=active]:bg-violet-600 data-[state=active]:text-white"
                    >
                      2025
                    </TabsTrigger>
                  </TabsList>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-neutral-400 mb-4 text-center">
                    Visual representation of your daily evaluations.
                  </p>
                  <TabsContent value="2024">
                    <div className="overflow-x-auto flex justify-center">
                      {renderContributionGraph("2024")}
                    </div>
                  </TabsContent>
                  <TabsContent value="2025">
                    <div className="overflow-x-auto flex justify-center">
                      {renderContributionGraph("2025")}
                    </div>
                  </TabsContent>
                </CardContent>
              </Card>
            </Tabs>
          </div>
        </>
      )}
    </Layout>
  )
}
