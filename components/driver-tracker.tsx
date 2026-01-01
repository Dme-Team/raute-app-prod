"use client"

import { useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"

interface DriverTrackerProps {
    driverId: string
    isOnline: boolean
}

export function DriverTracker({ driverId, isOnline }: DriverTrackerProps) {
    const watchId = useRef<number | null>(null)
    const lastUpdateRef = useRef<number>(0)
    const UPDATE_INTERVAL = 10000 // 10 seconds throttle

    useEffect(() => {
        if (!isOnline || !driverId) {
            stopTracking()
            return
        }

        startTracking()

        return () => stopTracking()
    }, [isOnline, driverId])

    function startTracking() {
        if (!navigator.geolocation) {
            console.error("Geolocation is not supported by this browser.")
            return
        }

        console.log("📍 Starting location tracking...")

        // Watch Position
        watchId.current = navigator.geolocation.watchPosition(
            handlePositionUpdate,
            (error) => console.error("Location error:", error),
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            }
        )
    }

    function stopTracking() {
        if (watchId.current !== null) {
            navigator.geolocation.clearWatch(watchId.current)
            watchId.current = null
            console.log("🛑 Stopped location tracking.")
        }
    }

    async function handlePositionUpdate(position: GeolocationPosition) {
        const now = Date.now()
        // Throttle updates
        if (now - lastUpdateRef.current < UPDATE_INTERVAL) {
            return
        }

        try {
            const { latitude, longitude } = position.coords

            // Only update if we have valid coords
            if (latitude && longitude) {
                lastUpdateRef.current = now

                // Optimistic update (fire and forget mostly, but we log errors)
                const { error } = await supabase
                    .from('drivers')
                    .update({
                        current_lat: latitude,
                        current_lng: longitude,
                        last_location_update: new Date().toISOString()
                    })
                    .eq('id', driverId)

                if (error) {
                    console.error("Failed to update location in DB:", error)
                } else {
                    console.log("📡 Location synced:", latitude, longitude)
                }
            }
        } catch (err) {
            console.error("Error processing position update:", err)
        }
    }

    // Render nothing (headless component)
    return null
}
