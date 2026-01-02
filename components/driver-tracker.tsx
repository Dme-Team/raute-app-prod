import { useEffect } from "react" // Removing useRef
import { geoService } from "@/lib/geo-service"

interface DriverTrackerProps {
    driverId: string
    isOnline: boolean
    userId?: string
}

export function DriverTracker({ driverId, isOnline, userId }: DriverTrackerProps) {
    useEffect(() => {
        if (userId) geoService.init(userId)
    }, [userId])

    useEffect(() => {
        if (isOnline) {
            geoService.startTracking()
        } else {
            geoService.stopTracking()
        }
        return () => geoService.stopTracking()
    }, [isOnline])

    return null
}
