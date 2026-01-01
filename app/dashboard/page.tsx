'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity, CheckCircle2, Clock, Package, Truck, AlertCircle, TrendingUp, MapPin, ArrowRight } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

import { useRouter } from 'next/navigation' // Fix: Import useRouter
import { SetupGuide } from '@/components/setup-guide'
import Link from 'next/link'

export default function DashboardPage() {
    const [isLoading, setIsLoading] = useState(true)
    const [orders, setOrders] = useState<any[]>([]) // Full orders list for aggregation
    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        assigned: 0,
        inProgress: 0,
        delivered: 0,
        cancelled: 0
    })
    const [activeDrivers, setActiveDrivers] = useState(0)
    const [recentOrders, setRecentOrders] = useState<any[]>([])
    const [userName, setUserName] = useState('')
    const router = useRouter()
    const [hasHubs, setHasHubs] = useState(false)
    const [driversMap, setDriversMap] = useState<Record<string, any>>({})

    useEffect(() => {
        fetchDashboardData()

        // Realtime Subscription
        const channel = supabase
            .channel('dashboard_updates')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'orders'
                },
                () => {
                    fetchDashboardData()
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'drivers'
                },
                () => {
                    fetchDashboardData()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    async function fetchDashboardData() {
        try {
            // Get User & Session
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) return

            // Get Profile & Role
            const { data: profile } = await supabase
                .from('users')
                .select('full_name, role, company_id')
                .eq('id', session.user.id)
                .single()

            if (profile) {
                // 🔒 Security Check: Redirect Drivers immediately
                if (profile.role === 'driver') {
                    router.replace('/orders') // Use Next.js router for smoother redirect
                    return // Return immediately and DO NOT set loading to false
                }

                setUserName(profile.full_name || 'Manager')

                // Check if hubs exist
                if (profile.company_id) {
                    const { count, error } = await supabase
                        .from('hubs')
                        .select('*', { count: 'exact', head: true })
                        .eq('company_id', profile.company_id)

                    if (!error) {
                        setHasHubs((count || 0) > 0)
                    } else {
                        console.warn('Hubs table might not exist yet:', error)
                    }

                    // FETCH DRIVERS
                    const { data: driversData } = await supabase
                        .from('drivers')
                        .select('id, name, vehicle_type')
                        .eq('company_id', profile.company_id)

                    if (driversData) {
                        const dMap: Record<string, any> = {}
                        driversData.forEach(d => { dMap[d.id] = d })
                        setDriversMap(dMap)
                    }

                    // FETCH ORDERS
                    const today = new Date().toISOString().split('T')[0]
                    const { data: ordersData, error: ordersError } = await supabase
                        .from('orders')
                        .select('*')
                        .eq('company_id', profile.company_id)
                        .gte('created_at', today) // Filter by today if desired, or remove to see all
                        .order('created_at', { ascending: false })

                    if (ordersError) throw ordersError

                    if (ordersData) {
                        setOrders(ordersData)
                        // ... stats calculation ...
                        const newStats = {
                            total: ordersData.length,
                            pending: ordersData.filter(o => o.status === 'pending').length,
                            assigned: ordersData.filter(o => o.status === 'assigned').length,
                            inProgress: ordersData.filter(o => o.status === 'in_progress').length,
                            delivered: ordersData.filter(o => o.status === 'delivered').length,
                            cancelled: ordersData.filter(o => o.status === 'cancelled').length
                        }
                        setStats(newStats)
                        setRecentOrders(ordersData.slice(0, 5))
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const getGreeting = () => {
        const hour = new Date().getHours()
        if (hour < 12) return 'Good Morning'
        if (hour < 18) return 'Good Afternoon'
        return 'Good Evening'
    }

    if (isLoading) {
        return <DashboardSkeleton />
    }



    return (
        <div className="p-4 space-y-6 pb-24 max-w-7xl mx-auto">
            {/* 0. SETUP GUIDE (Only for new accounts) */}
            <SetupGuide
                hasDrivers={activeDrivers > 0 || stats.total > 0} // Loose check: if they have activity, maybe skip? Actually let's be strict.
                hasOrders={stats.total > 0}
                hasHubs={hasHubs}
            />

            {/* 1. WELCOME & ACTIONS HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">
                        {getGreeting()}, {userName.split(' ')[0]}! 👋
                    </h1>
                    <p className="text-slate-500">Live Operations Overview</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => router.push('/orders')}
                        className="flex-1 md:flex-none inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-sm hover:bg-slate-50 transition-colors"
                    >
                        <Package className="mr-2 h-4 w-4" />
                        Manage Orders
                    </button>
                    <button
                        onClick={() => router.push('/planner')}
                        className="flex-1 md:flex-none inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700 transition-colors"
                    >
                        <MapPin className="mr-2 h-4 w-4" />
                        Route Planner
                    </button>
                </div>
            </div>

            {/* 2. CRITICAL ALERTS BANNER (Only if needed) */}
            {stats.pending > 0 && (
                <div onClick={() => router.push('/planner')} className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between cursor-pointer hover:bg-amber-100 transition-colors group">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center">
                            <AlertCircle size={20} className="animate-pulse" />
                        </div>
                        <div>
                            <h3 className="font-bold text-amber-900">Attention Needed: {stats.pending} Unassigned Orders</h3>
                            <p className="text-amber-700 text-sm">Assign them to drivers to start delivery.</p>
                        </div>
                    </div>
                    <ArrowRight className="text-amber-500 group-hover:translate-x-1 transition-transform" />
                </div>
            )}

            {/* 3. KEY METRICS GRID */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard title="Total Volume" value={stats.total} icon={Package} color="text-slate-600" bg="bg-slate-50" />
                <StatsCard title="In Progress" value={stats.inProgress + stats.assigned} icon={Truck} color="text-blue-600" bg="bg-blue-50" />
                <StatsCard title="Completed" value={stats.delivered} icon={CheckCircle2} color="text-green-600" bg="bg-green-50" />
                <StatsCard title="Issues/Cancel" value={stats.cancelled} icon={AlertCircle} color="text-red-600" bg="bg-red-50" />
            </div>

            {/* 4. LIVE FLEET PROGRESS (The "Mission Control" Core) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Driver Progress List (Takes up 2 columns) */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <Truck className="text-blue-600" size={20} />
                            Live Fleet Progress
                        </h2>
                        <span className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-1 rounded-full animate-pulse">
                            ● Live Updates
                        </span>
                    </div>

                    <div className="grid gap-4">
                        {/* We need to calculate driver stats from the 'orders' array we already have */}
                        {/* This is a visual enhancement, assuming we can group orders by driver_id locally */}
                        {Object.values(orders.reduce((acc: any, order: any) => {
                            // Temporary grouping logic for display
                            if (!order.driver_id) return acc;
                            if (!acc[order.driver_id]) acc[order.driver_id] = { name: 'Driver', total: 0, completed: 0, id: order.driver_id };
                            acc[order.driver_id].total++;
                            if (order.status === 'delivered') acc[order.driver_id].completed++;
                            return acc;
                        }, {})).map((driver: any, idx) => (
                            <DriverProgressCard key={driver.id || idx} driver={driver} index={idx} />
                        ))}

                        {/* If no active drivers */}
                        {!orders.some(o => o.driver_id) && (
                            <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl">
                                <p className="text-slate-400 font-medium">No drivers active yet today.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Recent Activity Feed (Side Column) */}
                <div className="space-y-4">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <Activity className="text-purple-600" size={20} />
                        Latest Activity
                    </h2>
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        {recentOrders.length === 0 ? (
                            <div className="p-6 text-center text-slate-400 text-sm">No activity recorded</div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {recentOrders.map((order) => (
                                    <div key={order.id} className="p-3 flex items-start gap-3 hover:bg-slate-50 transition-colors">
                                        <div className={`mt-0.5 h-2 w-2 rounded-full flex-shrink-0 ${order.status === 'delivered' ? 'bg-green-500' :
                                            order.status === 'assigned' ? 'bg-blue-500' : 'bg-yellow-500'
                                            }`} />
                                        <div>
                                            <p className="text-sm font-medium text-slate-800">
                                                {order.status === 'delivered' ? 'Delivered to' : 'New order for'} {order.customer_name}
                                            </p>
                                            <p className="text-xs text-slate-400">
                                                {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

function DriverProgressCard({ driver, index }: { driver: any, index: number }) {
    const percentage = Math.round((driver.completed / driver.total) * 100) || 0

    return (
        <Link href={`/map?driverId=${driver.id}`}>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group relative">
                {/* Hover Indicator */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <MapPin size={10} /> Track Live
                </div>

                <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-xl shrink-0 group-hover:bg-blue-50 transition-colors">
                    {driver.vehicle === 'Truck' ? '🚛' : driver.vehicle === 'Van' ? 'mw' : '👨‍✈️'}
                </div>
                <div className="flex-1">
                    <div className="flex justify-between mb-1">
                        <h3 className="font-bold text-slate-800 group-hover:text-blue-700 transition-colors">{driver.name}</h3>
                        <span className="text-xs font-bold text-slate-600">{driver.completed}/{driver.total} Stops</span>
                    </div>
                    {/* Progress Bar */}
                    <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-1000 ${percentage === 100 ? 'bg-green-500' : 'bg-blue-600'}`}
                            style={{ width: `${percentage}%` }}
                        />
                    </div>
                </div>
                <div className="text-center min-w-[3rem]">
                    <span className={`text-sm font-bold ${percentage === 100 ? 'text-green-600' : 'text-blue-600'}`}>
                        {percentage}%
                    </span>
                </div>
            </div>
        </Link>
    )
}

function StatsCard({ title, value, icon: Icon, color, bg }: any) {
    return (
        <div className="bg-card text-card-foreground p-4 rounded-xl shadow-sm border border-border flex flex-col justify-between h-28 relative overflow-hidden group">
            <div className={`absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform duration-500 ${color}`}>
                <Icon size={64} />
            </div>
            <div className={`h-10 w-10 ${bg} ${color} rounded-lg flex items-center justify-center mb-2`}>
                <Icon size={20} />
            </div>
            <div>
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">{title}</p>
                <p className="text-2xl font-bold text-foreground">{value}</p>
            </div>
        </div>
    )
}

function DashboardSkeleton() {
    return (
        <div className="p-4 space-y-6">
            <div className="space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-64" />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Skeleton className="h-64 rounded-2xl lg:col-span-2" />
                <Skeleton className="h-64 rounded-xl" />
            </div>
            <div className="space-y-4">
                <Skeleton className="h-6 w-32" />
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
            </div>
        </div>
    )
}
