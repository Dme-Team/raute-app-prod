
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { useCallback } from 'react';

// Check if running in a "native" context (Capacitor)
const isNative = typeof window !== 'undefined' && window.localStorage?.getItem('cap_platform') !== null; // Rough check, or use Capacitor.isNativePlatform()

export function useHaptic() {

    const trigger = useCallback(async (style: ImpactStyle = ImpactStyle.Light) => {
        try {
            // Try Capacitor Haptics first
            await Haptics.impact({ style });
        } catch (e) {
            // Fallback to Web Vibration API
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
                navigator.vibrate(style === ImpactStyle.Heavy ? 20 : 10);
            }
        }
    }, []);

    const light = () => trigger(ImpactStyle.Light);
    const medium = () => trigger(ImpactStyle.Medium);
    const heavy = () => trigger(ImpactStyle.Heavy);
    const success = async () => {
        try { await Haptics.notification({ type: 'success' as any }); }
        catch { if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([10, 30, 20]); }
    };
    const error = async () => {
        try { await Haptics.notification({ type: 'error' as any }); }
        catch { if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([50, 30, 50, 30, 50]); }
    };

    return { trigger, light, medium, heavy, success, error };
}
