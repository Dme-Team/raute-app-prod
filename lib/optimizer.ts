import { Driver, Order } from './supabase'

/**
 * OPTIMIZER CONFIGURATION
 */
interface OptimizationResult {
    orders: Order[]
    summary: {
        totalDistance: number
        unassignedCount: number
    }
}

/**
 * Calculates straight-line distance between two points (Haversine approximation for speed)
 */
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371 // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1)
    const dLon = deg2rad(lon2 - lon1)
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c // Distance in km
}

function deg2rad(deg: number): number {
    return deg * (Math.PI / 180)
}

/**
 * MAIN OPTIMIZATION FUNCTION
 * 
 * Rules:
 * 1. Locked Orders: MUST stay with their assigned driver.
 * 2. Time Windows: High priority.
 * 3. Proximity: Assign to nearest driver (Hub-based or Current Location).
 */
export async function optimizeRoute(orders: Order[], drivers: Driver[]): Promise<OptimizationResult> {

    let updatedOrders = [...orders]

    // FILTER: Ignore 'delivered' or 'cancelled' orders from re-assignment
    // They stay as they are.
    const activeOrders = orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled')

    // 1. Separate Locked vs Unlocked Orders (from ACTIVE orders only)
    const lockedOrders = activeOrders.filter(o => o.locked_to_driver && o.driver_id)
    const availableOrders = activeOrders.filter(o => !o.locked_to_driver)

    // Map drivers to their starting positions (Default Hub or Last Known)
    // For MVP, we assume a "Hub" at Cairo Center if not set.
    const HUB_LAT = 30.0444
    const HUB_LNG = 31.2357

    const driverPositions = drivers.map(d => ({
        id: d.id,
        lat: d.current_lat || d.default_start_lat || HUB_LAT,
        lng: d.current_lng || d.default_start_lng || HUB_LNG,
        load: lockedOrders.filter(o => o.driver_id === d.id).length
    }))

    // 2. Assign Available Orders to Nearest Driver (Clustering)
    // In a real VRPTW, we'd use a solver. Here, we use a "Nearest Driver" Heuristic.

    for (const order of availableOrders) {
        if (!order.latitude || !order.longitude) continue; // Skip bad data

        let bestDriverId = null
        let minScore = Infinity

        for (const driver of driverPositions) {
            // Calculate Distance Score
            const distance = getDistance(driver.lat, driver.lng, order.latitude, order.longitude)

            // Calculate Load Balance Score (Penalty for having too many orders)
            // This prevents one driver from getting everything.
            const loadPenalty = driver.load * 5 // 5km penalty per order assigned

            const totalScore = distance + loadPenalty

            if (totalScore < minScore) {
                minScore = totalScore
                bestDriverId = driver.id
            }
        }

        if (bestDriverId) {
            // Update the local state of the order
            const orderIndex = updatedOrders.findIndex(o => o.id === order.id)
            if (orderIndex !== -1) {
                updatedOrders[orderIndex] = {
                    ...updatedOrders[orderIndex],
                    driver_id: bestDriverId,
                    status: 'assigned',
                    locked_to_driver: false // Still AI assigned, so not locked
                }

                // Increment driver load for next iteration
                const driverPos = driverPositions.find(d => d.id === bestDriverId)
                if (driverPos) driverPos.load++
            }
        }
    }

    // 3. Sequence Orders for Each Driver (Routing)
    // Sort by Time Window Start -> Then Nearest Neighbor

    const finalOrders: Order[] = []

    for (const driver of drivers) {
        let driverOrders = updatedOrders.filter(o => o.driver_id === driver.id)

        if (driverOrders.length === 0) continue

        // Start point
        let currentLat = driver.current_lat || driver.default_start_lat || HUB_LAT
        let currentLng = driver.current_lng || driver.default_start_lng || HUB_LNG

        // Simple Greedy TSP (Nearest Neighbor) respecting Time Windows
        // 1. Sort buckets by Time Window (Morning, Any, Afternoon)
        // 2. Route inside buckets

        const sortedDriverOrders: Order[] = []
        let unrouted = [...driverOrders]

        // Sort unrouted by strict time window start if available
        unrouted.sort((a, b) => {
            if (a.time_window_start && !b.time_window_start) return -1
            if (!a.time_window_start && b.time_window_start) return 1
            if (a.time_window_start && b.time_window_start) {
                return a.time_window_start.localeCompare(b.time_window_start)
            }
            return 0
        })

        while (unrouted.length > 0) {
            // Find nearest to current location from the top 3 candidates (to respect time sort)
            // We only look at top candidates to keep the time-window sort priority high
            const candidatePoolSize = 5
            const candidates = unrouted.slice(0, candidatePoolSize)

            let bestNextIndex = -1
            let minDist = Infinity

            for (let i = 0; i < candidates.length; i++) {
                const o = candidates[i]
                if (o.latitude && o.longitude) {
                    const dist = getDistance(currentLat, currentLng, o.latitude, o.longitude)
                    if (dist < minDist) {
                        minDist = dist
                        bestNextIndex = i
                    }
                }
            }

            if (bestNextIndex !== -1) {
                const nextOrder = candidates[bestNextIndex]
                // Add route index
                const orderWithIndex = { ...nextOrder, route_index: sortedDriverOrders.length + 1 }
                sortedDriverOrders.push(orderWithIndex)

                // Update current location pointer
                if (nextOrder.latitude && nextOrder.longitude) {
                    currentLat = nextOrder.latitude
                    currentLng = nextOrder.longitude
                }

                // Remove from unrouted (careful with index since we sliced)
                // We restart logic to be safe and simple
                const realIndex = unrouted.findIndex(u => u.id === nextOrder.id)
                unrouted.splice(realIndex, 1)
            } else {
                // Should not happen if data is valid, but fallback:
                const fallback = unrouted.shift()
                if (fallback) sortedDriverOrders.push({ ...fallback, route_index: sortedDriverOrders.length + 1 })
            }
        }

        finalOrders.push(...sortedDriverOrders)
    }

    // Add back any unassigned orders
    const unassigned = updatedOrders.filter(o => !o.driver_id)
    finalOrders.push(...unassigned)

    return {
        orders: finalOrders,
        summary: {
            totalDistance: 0, // Mock for now
            unassignedCount: unassigned.length
        }
    }
}
