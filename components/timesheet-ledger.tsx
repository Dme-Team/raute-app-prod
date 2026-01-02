"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { format, differenceInMinutes, parseISO } from "date-fns"
import { Calendar, Clock, Download, FileText, Filter, Truck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"

type TimesheetEntry = {
    id: string
    driver_name: string
    driver_id: string
    date: string
    start_time: string
    end_time: string | null
    duration_minutes: number
    status: 'completed' | 'ongoing'
}

type RawLog = {
    id: string
    driver_id: string
    status: 'online' | 'offline'
    timestamp: string
    driver: { name: string } | null
}

export function TimesheetLedger() {
    const [entries, setEntries] = useState<TimesheetEntry[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [dateRange, setDateRange] = useState<Date | undefined>(new Date())

    useEffect(() => {
        fetchTimesheets()
    }, [dateRange])

    async function fetchTimesheets() {
        setIsLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: userProfile } = await supabase.from('users').select('company_id').eq('id', user.id).single()
            if (!userProfile) return

            // Fetch logs
            // We need to fetch logs for the selected date (or all if no date)
            // Ideally we get a range. For now, let's just get last 7 days or selected date.
            let query = supabase
                .from('driver_activity_logs')
                .select(`
                    id,
                    driver_id,
                    status,
                    timestamp,
                    driver:drivers!inner(name, company_id)
                `)
                .eq('driver.company_id', userProfile.company_id)
                .order('timestamp', { ascending: true }) // Ascending to process chronologically

            if (dateRange) {
                const startOfDay = new Date(dateRange)
                startOfDay.setHours(0, 0, 0, 0)
                const endOfDay = new Date(dateRange)
                endOfDay.setHours(23, 59, 59, 999)

                query = query.gte('timestamp', startOfDay.toISOString()).lte('timestamp', endOfDay.toISOString())
            } else {
                // Default limit if no filter? Or maybe last 30 days
            }

            const { data, error } = await query
            if (error) throw error

            processLogs((data as any) || [])

        } catch (error) {
            console.error("Error fetching timesheets:", error)
        } finally {
            setIsLoading(false)
        }
    }

    function processLogs(logs: RawLog[]) {
        const processed: TimesheetEntry[] = []
        const activeSessions: Record<string, RawLog> = {}

        logs.forEach(log => {
            const driverName = log.driver?.name || 'Unknown Driver'

            if (log.status === 'online') {
                // Start a session
                // If one already exists (maybe they crashed and restarted), let's close the previous one or ignore?
                // For simplicity, let's overwrite for now, or treat the previous as "incomplete end"
                activeSessions[log.driver_id] = log
            } else if (log.status === 'offline') {
                // End a session
                const startLog = activeSessions[log.driver_id]
                if (startLog) {
                    const start = parseISO(startLog.timestamp)
                    const end = parseISO(log.timestamp)
                    const duration = differenceInMinutes(end, start)

                    processed.push({
                        id: `${startLog.id}-${log.id}`,
                        driver_id: log.driver_id,
                        driver_name: driverName,
                        date: format(start, 'yyyy-MM-dd'),
                        start_time: startLog.timestamp,
                        end_time: log.timestamp,
                        duration_minutes: duration,
                        status: 'completed'
                    })

                    delete activeSessions[log.driver_id]
                }
            }
        })

        // Handle ongoing sessions (drivers currently online)
        Object.values(activeSessions).forEach(startLog => {
            const start = parseISO(startLog.timestamp)
            const now = new Date()
            const duration = differenceInMinutes(now, start)

            processed.push({
                id: `${startLog.id}-ongoing`,
                driver_id: startLog.driver_id,
                driver_name: startLog.driver?.name || 'Unknown',
                date: format(start, 'yyyy-MM-dd'),
                start_time: startLog.timestamp,
                end_time: null, // Still running
                duration_minutes: duration,
                status: 'ongoing'
            })
        })

        // Sort by Date Descending
        processed.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
        setEntries(processed)
    }

    function formatDuration(minutes: number) {
        const hours = Math.floor(minutes / 60)
        const mins = minutes % 60
        return `${hours}h ${mins}m`
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                                <Calendar className="mr-2 h-4 w-4" />
                                {dateRange ? format(dateRange, "PPP") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                                mode="single"
                                selected={dateRange}
                                onSelect={setDateRange}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                    {dateRange && (
                        <Button variant="ghost" size="sm" onClick={() => setDateRange(undefined)} className="text-xs text-muted-foreground">
                            Clear Filter
                        </Button>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="gap-2">
                        <Download size={14} /> Export CSV
                    </Button>
                </div>
            </div>

            <div className="rounded-xl border border-border bg-card overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50">
                            <TableHead>Driver</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Start Time</TableHead>
                            <TableHead>End Time</TableHead>
                            <TableHead className="text-right">Duration</TableHead>
                            <TableHead className="w-[100px]">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            [1, 2, 3].map(i => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                                </TableRow>
                            ))
                        ) : entries.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                    No timesheet entries found for this period.
                                </TableCell>
                            </TableRow>
                        ) : (
                            entries.map((entry) => (
                                <TableRow key={entry.id}>
                                    <TableCell className="font-medium flex items-center gap-2">
                                        <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                                            <Truck size={14} />
                                        </div>
                                        {entry.driver_name}
                                    </TableCell>
                                    <TableCell>{format(parseISO(entry.start_time), 'MMM dd, yyyy')}</TableCell>
                                    <TableCell className="text-muted-foreground font-mono text-xs">
                                        {format(parseISO(entry.start_time), 'h:mm a')}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground font-mono text-xs">
                                        {entry.end_time ? format(parseISO(entry.end_time), 'h:mm a') : '—'}
                                    </TableCell>
                                    <TableCell className="text-right font-bold text-slate-700 dark:text-slate-300">
                                        {formatDuration(entry.duration_minutes)}
                                    </TableCell>
                                    <TableCell>
                                        <span className={cn("px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                                            entry.status === 'ongoing'
                                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                                : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
                                        )}>
                                            {entry.status === 'ongoing' ? 'Active' : 'Clocked Out'}
                                        </span>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
