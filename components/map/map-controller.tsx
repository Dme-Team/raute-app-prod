"use client"

import { useEffect } from "react"
import { useMap } from "react-leaflet"
import L from "leaflet"
import type { Order, Driver } from "@/lib/supabase"

export interface MapControllerProps {
    orders: Order[]
    drivers: Driver[]
    selectedDriverId: string | null
}

export default function MapController({ orders, drivers, selectedDriverId }: MapControllerProps) {
    const map = useMap()

    useEffect(() => {
        if (!map) return

        const points: [number, number][] = []

        // Add Order locations
        orders.forEach(o => {
            if (o.latitude && o.longitude) points.push([Number(o.latitude), Number(o.longitude)])
        })

        // Add Driver locations
        drivers.forEach(d => {
            if (d.current_lat && d.current_lng) points.push([d.current_lat, d.current_lng])
        })

        if (points.length > 0) {
            const bounds = L.latLngBounds(points)
            // If focused on a single driver with few points, don't zoom in *too* much
            const padding = selectedDriverId ? [50, 50] : [30, 30]

            map.fitBounds(bounds, {
                padding: padding as [number, number],
                maxZoom: 16,
                animate: true,
                duration: 1
            })
        }
    }, [orders, drivers, selectedDriverId, map])

    return null
}
