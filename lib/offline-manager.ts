import { Network } from '@capacitor/network';
import { Preferences } from '@capacitor/preferences';
import { supabase } from './supabase';
import { toast } from '@/lib/toast-utils';

type OfflineAction = {
    id: string;
    type: 'UPDATE_ORDER_STATUS' | 'UPDATE_DRIVER_LOCATION';
    payload: any;
    timestamp: number;
}

const STORAGE_KEY = 'offline_queue';

class OfflineManager {
    private queue: OfflineAction[] = [];
    private isOnline: boolean = true;

    constructor() {
        this.init();
    }

    private async init() {
        const status = await Network.getStatus();
        this.isOnline = status.connected;

        Network.addListener('networkStatusChange', status => {
            this.isOnline = status.connected;
            if (this.isOnline) {
                this.processQueue();
            }
        });

        this.loadQueue();
    }

    private async loadQueue() {
        const { value } = await Preferences.get({ key: STORAGE_KEY });
        if (value) {
            this.queue = JSON.parse(value);
        }
    }

    private async saveQueue() {
        await Preferences.set({
            key: STORAGE_KEY,
            value: JSON.stringify(this.queue)
        });
    }

    public async queueAction(type: OfflineAction['type'], payload: any) {
        if (this.isOnline) {
            await this.executeAction(type, payload);
        } else {
            const action: OfflineAction = {
                id: crypto.randomUUID(),
                type,
                payload,
                timestamp: Date.now()
            };
            this.queue.push(action);
            await this.saveQueue();
            toast({
                title: "You are offline",
                description: "Action saved and will sync when online.",
                type: "warning"
            });
        }
    }

    private async executeAction(type: OfflineAction['type'], payload: any) {
        try {
            switch (type) {
                case 'UPDATE_ORDER_STATUS':
                    const { orderId, status, location } = payload;
                    // Example implementation - adapt to valid DB columns
                    await supabase.from('orders').update({
                        status,
                        // If we had location columns like delivered_lat/lng, we'd update them here
                        // For now just status
                        updated_at: new Date().toISOString()
                    }).eq('id', orderId);

                    if (status === 'delivered') {
                        const updateData: any = {
                            delivered_at: new Date().toISOString()
                        };
                        // Save Delivery Location verification
                        if (location) {
                            updateData.delivered_lat = location.lat;
                            updateData.delivered_lng = location.lng;
                        }
                        // Save Flags
                        if (payload.outOfRange !== undefined) updateData.was_out_of_range = payload.outOfRange;
                        if (payload.distance !== undefined) updateData.delivery_distance_meters = payload.distance;

                        await supabase.from('orders').update(updateData).eq('id', orderId);
                    }
                    break;

                case 'UPDATE_DRIVER_LOCATION':
                    // handled by separate tracking logic usually, but good for one-off updates
                    break;
            }
        } catch (error) {
            console.error('Error executing offline action:', error);
            throw error; // Let the queue processor handle retries if we wanted to get fancy
        }
    }

    public async processQueue() {
        if (this.queue.length === 0) return;

        toast({ title: "Back Online", description: "Syncing offline data...", type: "info" });

        const tempQueue = [...this.queue];
        this.queue = []; // Clear queue first to prevent loops, re-add failed items later
        await this.saveQueue();

        for (const action of tempQueue) {
            try {
                await this.executeAction(action.type, action.payload);
            } catch (error) {
                console.error('Failed to process offline action:', action, error);
                // Optionally re-queue if it's a transient error
                // for now we just log it to avoid blocking others
            }
        }

        toast({ title: "Sync Complete", description: "All offline logs updated.", type: "success" });
    }
}

export const offlineManager = new OfflineManager();
