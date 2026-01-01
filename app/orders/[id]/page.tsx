import ClientOrderDetails from "./client-page"

// Required for static export (Capacitor)
export async function generateStaticParams() {
    return []
}

export default function OrderDetailsPage() {
    return <ClientOrderDetails />
}
