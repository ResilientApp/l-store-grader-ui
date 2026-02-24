"use client"

import React, { useEffect, useState } from "react"
import axios from "axios"
import { useParams, useNavigate } from "react-router-dom"
import { Layout } from "../components/Layout"
import { Loader } from "../components/Loader"
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "../components/ui/accordion"
import { Badge } from "../components/ui/badge"
import { Tooltip, TooltipTrigger, TooltipContent } from "../components/ui/tooltip"
import { ScrollArea } from "../components/ui/scroll-area"
import { Input } from "../components/ui/input"
import QRCode from "react-qr-code"
import { toast } from "sonner"
import {
  CheckCircle2,
  XCircle,
  FileCog,
  Code,
  Settings,
  Cpu,
  Share2,
} from "lucide-react"
import { Card, CardContent } from "../components/ui/card"

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "/api"

function renderTestIcon(passed: boolean) {
  return passed ? (
    <CheckCircle2 className="inline-block h-5 w-5 text-green-400" />
  ) : (
    <XCircle className="inline-block h-5 w-5 text-red-400" />
  )
}

function renderTotalTimeBadge(totalSeconds: number) {
  let label = ""
  let colorClass = ""

  if (totalSeconds < 60) {
    label = "Great Performance"
    colorClass = "bg-green-600"
  } else if (totalSeconds < 120) {
    label = "Good Performance"
    colorClass = "bg-blue-600"
  } else if (totalSeconds < 300) {
    label = "Needs Optimization"
    colorClass = "bg-orange-600"
  } else {
    label = "Severe Optimization"
    colorClass = "bg-red-600"
  }

  return (
    <Badge className={`select-none text-white ${colorClass}`}>{label}</Badge>
  )
}

function PerformanceBars({ 
  performance, 
  total_time 
}: { 
  performance: any; 
  total_time?: number 
}) {
  const metrics = Object.entries(performance ?? {}).filter(
    ([k]) => k !== "total_time"
  )

  if (!metrics.length && total_time === undefined) {
    return <p className="text-sm text-neutral-400">No performance data.</p>
  }

  const times = metrics.map(([_, val]) => Number(val) || 0)
  const maxTime = Math.max(...times)

  const labelMap: Record<string, string> = {
    agg_time: "Aggregate",
    delete_time: "Delete",
    insert_time: "Insert",
    select_time: "Select",
    update_time: "Update",
  }

  return (
    <div className="space-y-3">
      {metrics.map(([metric, val]) => {
        const valueNum = Number(val) || 0
        const barPercent = maxTime ? (valueNum / maxTime) * 100 : 0
        const label = labelMap[metric] ?? metric
        return (
          <div key={metric} className="text-sm">
            <div className="flex items-center justify-between mb-1">
              <span className="text-neutral-300">{label}</span>
              <span className="text-neutral-500">{valueNum} s</span>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="w-full h-3 bg-neutral-800 rounded relative cursor-pointer overflow-hidden">
                  <div
                    className="h-3 bg-violet-600 transition-all duration-150"
                    style={{ width: `${barPercent}%` }}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-sm">
                  {label}: {valueNum} s
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
        )
      })}

      {total_time !== undefined && (
        <div className="text-sm pt-3 mt-3 border-t border-neutral-800">
          <div className="flex items-center justify-between mb-1">
            <span className="text-neutral-200 font-medium">Subprocess Total Time</span>
            <span className="text-neutral-400">{total_time} s</span>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="w-full h-3 bg-neutral-800 rounded relative cursor-pointer overflow-hidden">
                <div
                  className="h-3 bg-blue-600 transition-all duration-150"
                  style={{ width: `100%` }} 
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-sm">
                Subprocess Total Time: {total_time} s
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
      )}
    </div>
  )
}

function AIStatsBadges({ aiStats }: { aiStats: any }) {
  if (!aiStats || Object.keys(aiStats).length === 0) return null

  const {
    pickle_serialization_confidence,
    json_serialization_confidence,
    struct_serialization_confidence,
    ai_generated_confidence,
  } = aiStats

  const items = [
    {
      label: "Pickle",
      value: pickle_serialization_confidence,
      icon: <FileCog className="inline-block w-4 h-4" />,
    },
    {
      label: "JSON",
      value: json_serialization_confidence,
      icon: <Code className="inline-block w-4 h-4" />,
    },
    {
      label: "Struct",
      value: struct_serialization_confidence,
      icon: <Settings className="inline-block w-4 h-4" />,
    },
    {
      label: "AI",
      value: ai_generated_confidence,
      icon: <Cpu className="inline-block w-4 h-4" />,
    },
  ]

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
      {items.map(({ label, value, icon }, idx) => {
        if (value === undefined || value === null) return null
        const percent = Math.round((value ?? 0) * 100)
        return (
          <Badge
            key={idx}
            className="bg-violet-600 text-white select-none flex items-center gap-1 px-2 py-1"
          >
            {icon}
            {label} ~{percent}%
          </Badge>
        )
      })}
    </div>
  )
}

function GitStatsChart({
  contributors,
}: {
  contributors: { name: string; level: number }[]
}) {
  const maxBarHeight = 60
  if (!contributors.length) {
    return <p className="text-sm text-neutral-400">No contributors found.</p>
  }

  return (
    <div className="flex items-end justify-center gap-4">
      {contributors.map((c) => {
        const levelValue = Math.min(Math.max(c.level, 0), 1)
        const barHeight = levelValue * maxBarHeight
        // Just a simple color gradient
        const greyHex = 0x88
        const violetHex = 0x5b
        const blend = Math.round(greyHex + (violetHex - greyHex) * levelValue)
        const color = `rgb(${blend},33,182)`
        return (
          <Tooltip key={c.name}>
            <TooltipTrigger asChild>
              <div className="flex flex-col items-center cursor-pointer">
                <div
                  className="w-4 transition-all duration-150"
                  style={{ height: `${barHeight}px`, backgroundColor: color }}
                />
                <p className="text-xs mt-2 text-neutral-300">{c.name}</p>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-sm">
                {c.name}: ~{Math.round(levelValue * 100)}% contribution
              </p>
            </TooltipContent>
          </Tooltip>
        )
      })}
    </div>
  )
}

export function Results() {
  const params = useParams()
  const navigate = useNavigate()
  const transactionId = params.transaction_id

  const [loading, setLoading] = useState(true)
  const [results, setResults] = useState<any>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        let response
        if (transactionId) {
          // GET /results/<transactionId>
          response = await axios.get(`${BACKEND_URL}/results/${transactionId}`)
          if (!response.data) {
            navigate("/")
            return
          }
          // If the data is wrapped under "resilientdb_result", unwrap it:
          const topLevel = response.data
          if (topLevel.resilientdb_result) {
            const unwrapped = {
              ...topLevel.resilientdb_result.data,
              resilientdb_tx_id: topLevel.resilientdb_tx_id,
            }
            setResults(unwrapped)
          } else {
            setResults(topLevel)
          }
        } else {
          // If no transactionId, we might do a POST with milestone=...
          const milestone = new URLSearchParams(window.location.search).get("milestone")
          const timeout = new URLSearchParams(window.location.search).get("timeout")
          response = await axios.post(`${BACKEND_URL}/results`, { milestone, timeout })
          setResults(response.data)
        }
      } catch (error) {
        console.error("Error fetching results:", error)
        navigate("/")
      }
      setLoading(false)
    }

    fetchData()
  }, [transactionId, navigate])

  // If loading, show loader
  if (loading) {
    return (
      <Layout>
        <Loader show text="Loading results..." />
      </Layout>
    )
  }

  // If we have no results
  if (!results) {
    return (
      <Layout>
        <div className="text-neutral-100">No results found.</div>
      </Layout>
    )
  }

  // Destructure final output
  const {
    milestone,
    submission_name,
    passed,
    total_tests,
    performance_results,
    ai_tests,
    tests,
    commit_stats,
    shareLink,
    subprocess_total_time = 0,
  } = results

  // This is the overall pipeline time
  const totalExecTime = Number(subprocess_total_time) || 0

  // Fallbacks
  const submissionName = submission_name || "Unnamed Submission"
  const testCasesPassed = typeof passed === "number" ? passed : 0
  const testCasesTotal = typeof total_tests === "number" ? total_tests : 0
  const performance = performance_results || {}
  const aiTestsData = ai_tests || {}
  const shareUrl = shareLink || (typeof window !== "undefined" ? window.location.href : "")
  const total_time = subprocess_total_time || 0

  // Convert your tests object to an array for the Accordion
  const testcases = tests
    ? Object.entries(tests).map(([name, details]: [string, any]) => ({
        name,
        summary: details.message,
        passed: details.status === "Passed",
        error: details.status === "Passed" ? null : details.error || "",
      }))
    : []

  const rawContributors = commit_stats?.contributors || []
  const totalCommits = rawContributors.reduce(
    (acc: number, c: any) => acc + (c.commits || 0),
    0
  )
  const contributors = rawContributors.map((c: any) => ({
    name: c.name,
    // normalized [0..1]
    level: totalCommits > 0 ? c.commits / totalCommits : 0,
  }))

  const allPassed = testCasesPassed === testCasesTotal
  const testBadgeClass = allPassed ? "bg-green-600" : "bg-red-600"

  const handleShareFieldClick = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl)
      toast.success("Copied share link!", {
        style: {
          background: "#222",
          color: "#fff",
        },
      })
    }
  }

  return (
    <Layout>
      <div className="flex flex-col md:flex-row gap-6 px-4">
        {/* Left Card: Milestone / Submission / # Tests */}
        <Card className="flex-1 bg-neutral-900 text-neutral-100 border border-neutral-700 rounded shadow h-[370px]">
          <CardContent>
            <div className="flex flex-wrap items-center justify-center gap-3 mb-4">
              <Badge className="bg-neutral-600 text-white select-none px-2 py-1">
                {milestone || "No milestone"}
              </Badge>
              <Badge className="bg-violet-600 text-white select-none px-2 py-1">
                {submissionName}
              </Badge>
              <Badge className={`text-white select-none px-2 py-1 ${testBadgeClass}`}>
                {testCasesPassed}/{testCasesTotal} Tests
              </Badge>
            </div>

            <div className="text-center mb-4">
              <p className="text-sm text-neutral-300">Share or Scan this QR code:</p>
            </div>

            <div className="flex justify-center mb-4">
              <QRCode
                value={shareUrl || "Invalid URL"}
                fgColor="#FFFFFF"
                bgColor="#202020"
                size={130}
              />
            </div>

            {/* Responsive container for share link input */}
            <div
              className="relative mx-auto w-full max-w-xs sm:max-w-sm md:max-w-md cursor-pointer select-none"
              onClick={handleShareFieldClick}
            >
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
                <Share2 className="h-4 w-4" />
              </span>
              <Input
                readOnly
                value={shareUrl || ""}
                className="pl-8 bg-neutral-800 border border-neutral-700 text-sm text-white pointer-events-none w-full"
              />
            </div>
          </CardContent>
        </Card>

        {/* Right Card: Performance Bars */}
        <Card className="flex-1 bg-neutral-900 text-neutral-100 border border-neutral-700 rounded shadow h-[370px]">
          <CardContent>
            <div className="flex items-center justify-center mb-4">
              {renderTotalTimeBadge(totalExecTime)}
            </div>
            <PerformanceBars performance={performance} total_time={total_time}/>
          </CardContent>
        </Card>
      </div>

      {/* Tests + AI Stats + Git Stats */}
      <div className="px-4 mt-6 w-full">
        <Card className="bg-neutral-900 text-neutral-100 border border-neutral-700 rounded shadow w-full">
          <CardContent className="flex flex-col items-center text-center gap-6">
            {/* AI Stats if present */}
            {Object.keys(aiTestsData).length > 0 && (
              <AIStatsBadges aiStats={aiTestsData} />
            )}

            {/* Testcases => scroll area => hide arrow => [svg:last-child]:hidden + no flipping */}
            <ScrollArea className="w-full max-w-2xl">
              <div className="space-y-2 mx-auto">
                {(testcases ?? []).length === 0 && (
                  <p className="text-sm text-neutral-400">No test cases found.</p>
                )}
                {testcases?.map((tc: any, idx: number) => (
                  <Accordion
                    key={idx}
                    type="single"
                    collapsible
                    className="bg-neutral-900 border border-neutral-700 rounded"
                  >
                    <AccordionItem value={`test-${idx}`}>
                      {/* Overriding default rotation => hide last-child (arrow), force no transform */}
                      <AccordionTrigger
                        className="
                          flex items-center gap-2 text-sm px-3 py-2 
                          [svg:last-child]:hidden
                          data-[state=open]:[&>svg]:!rotate-0 
                          data-[state=open]:[&>svg]:!transform-none
                        "
                      >
                        {renderTestIcon(tc.passed)}
                        <span className="font-semibold">{tc.name}</span>
                      </AccordionTrigger>
                      <AccordionContent className="text-sm text-neutral-300 space-y-2 px-3 py-2">
                        <p>
                          <span className="font-semibold">Summary:</span> {tc.summary}
                        </p>
                        {!tc.passed && tc.error && (
                          <p className="text-red-400">
                            <span className="font-semibold">Error: </span>
                            {tc.error}
                          </p>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                ))}
              </div>
            </ScrollArea>

            {/* Git Stats if we have commit contributors */}
            {contributors.length > 0 && (
              <div className="bg-neutral-800 border border-neutral-700 rounded p-4 w-full max-w-md shadow-sm mx-auto">
                <h2 className="text-base font-semibold text-white mb-4">
                  Git Stats
                </h2>
                <div className="flex justify-center">
                  <GitStatsChart contributors={contributors} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
