"use client"

import { useState } from "react"
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet"
import { MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import "leaflet/dist/leaflet.css"

// Fix Leaflet default marker icon
if (typeof window !== 'undefined') {
    const L = require('leaflet')
    delete (L.Icon.Default.prototype as any)._getIconUrl
    L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    })
}

interface MapPickerContentProps {
    onLocationSelect: (location: {
        lat: number
        lng: number
        address?: string
        city?: string
        state?: string
        zipCode?: string
    }) => void
    onClose: () => void
    initialPosition?: [number, number]
}

// Map click handler component
function MapClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
    useMapEvents({
        click: (e) => {
            onClick(e.latlng.lat, e.latlng.lng)
        },
    })
    return null
}

export default function MapPickerContent({ onLocationSelect, onClose, initialPosition }: MapPickerContentProps) {
    const [selectedPosition, setSelectedPosition] = useState<[number, number] | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [address, setAddress] = useState<string>("")

    // Default to Cairo, Egypt
    const defaultCenter: [number, number] = initialPosition || [30.0444, 31.2357]

    async function reverseGeocode(lat: number, lng: number) {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
                {
                    headers: {
                        'User-Agent': 'Raute Delivery App'
                    }
                }
            )
            const data = await response.json()

            if (data && data.address) {
                const addr = data.address
                return {
                    address: addr.road || addr.neighbourhood || '',
                    city: addr.city || addr.town || addr.village || '',
                    state: addr.state || '',
                    zipCode: addr.postcode || '',
                    displayName: data.display_name
                }
            }
            return null
        } catch (error) {
            console.error('Reverse geocoding error:', error)
            return null
        }
    }

    async function handleMapClick(lat: number, lng: number) {
        setSelectedPosition([lat, lng])
        setIsLoading(true)
        setAddress("Getting address...")

        const result = await reverseGeocode(lat, lng)

        if (result) {
            setAddress(result.displayName || "Unknown location")
        } else {
            setAddress("Address not found")
        }

        setIsLoading(false)
    }

    function handleConfirm() {
        if (selectedPosition) {
            reverseGeocode(selectedPosition[0], selectedPosition[1]).then(result => {
                onLocationSelect({
                    lat: selectedPosition[0],
                    lng: selectedPosition[1],
                    address: result?.address || '',
                    city: result?.city || '',
                    state: result?.state || '',
                    zipCode: result?.zipCode || '',
                })
                onClose()
            })
        }
    }

    return (
        <>
            {/* Map */}
            <div className="flex-1 relative" onWheel={(e) => e.stopPropagation()}>
                <MapContainer
                    center={defaultCenter}
                    zoom={12}
                    scrollWheelZoom={true}
                    style={{ height: '100%', width: '100%' }}
                    className="z-0"
                    wheelPxPerZoomLevel={60}
                >
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    />
                    <MapClickHandler onClick={handleMapClick} />
                    {selectedPosition && (
                        <Marker position={selectedPosition} />
                    )}
                </MapContainer>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200">
                {selectedPosition ? (
                    <div className="space-y-3">
                        <div className="bg-slate-50 p-3 rounded-lg">
                            <div className="flex items-start gap-2">
                                <MapPin size={16} className="mt-1 text-primary flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-900">Selected Location</p>
                                    <p className="text-xs text-slate-600 truncate">{address}</p>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Lat: {selectedPosition[0].toFixed(6)}, Lng: {selectedPosition[1].toFixed(6)}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={onClose}
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleConfirm}
                                disabled={isLoading}
                                className="flex-1"
                            >
                                {isLoading ? 'Loading...' : 'Confirm Location'}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="text-center text-slate-500 py-2">
                        <MapPin className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                        <p className="text-sm">Click anywhere on the map to select a location</p>
                    </div>
                )}
            </div>
        </>
    )
}
