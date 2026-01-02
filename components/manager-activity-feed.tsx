
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { Clock, Truck } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

type LogWithDriver = {
    id: string
    status: string
    timestamp: string
    driver: {
        name: string
    }
}

export function ManagerActivityFeed() {
    const [logs, setLogs] = useState<LogWithDriver[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        fetchLogs()
    }, [])

    async function fetchLogs() {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // We need to fetch logs for all drivers in the company.
            // RLS 'Managers can view all logs' policy handles the company filter implicitly basically.
            // But we should join with drivers to get names.
            const { data, error } = await supabase
                .from('driver_activity_logs')
                .select(`
                    id,
                    status,
                    timestamp,
                    driver:drivers(name)
                `)
                .order('timestamp', { ascending: false })
                .limit(20)

            if (error) throw error
            setLogs(data as any || [])
        } catch (err) {
            console.error(err)
        } finally {
            setIsLoading(false)
        }
    }

    if (isLoading) return <div className="space-y-3"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>

    if (logs.length === 0) return <div className="text-center text-sm text-slate-400 py-6">No recent driver activity.</div>

    return (
        <div className="space-y-4">
            {logs.map((log) => (
                <div key={log.id} className="flex gap-3 items-start">
                    <div className={`mt-0.5
                        relative z-10 w-8 h-8 rounded-full flex items-center justify-center border-2 shrink-0
                        ${log.status === 'online' ? 'bg-green-100 border-green-200 text-green-600' :
                            log.status === 'offline' ? 'bg-slate-100 border-slate-200 text-slate-500' : 'bg-blue-100 border-blue-200 text-blue-600'}
                    `}>
                        <Truck size={14} />
                    </div>

                    <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-none truncate">
                            {log.driver?.name || 'Unknown Driver'}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                            {log.status === 'online' ? 'started shift' : log.status === 'offline' ? 'ended shift' : 'is working'}
                        </p>
                    </div>

                    <div className="ml-auto text-[10px] text-slate-400 font-mono whitespace-nowrap">
                        {format(new Date(log.timestamp), 'HH:mm')}
                    </div>
                </div>
            ))}
        </div>
    )
}
