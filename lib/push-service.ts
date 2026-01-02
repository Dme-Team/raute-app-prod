import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from './supabase';
import { toast } from '@/lib/toast-utils';
import { Capacitor } from '@capacitor/core';

export const PushService = {
    async init() {
        if (!Capacitor.isNativePlatform()) {
            console.log("Push notifications not supported on web");
            return;
        }

        // Request permission
        let permStatus = await PushNotifications.checkPermissions();

        if (permStatus.receive === 'prompt') {
            permStatus = await PushNotifications.requestPermissions();
        }

        if (permStatus.receive !== 'granted') {
            console.error('User denied permissions!');
            return;
        }

        // Register
        await PushNotifications.register();

        this.addListeners();
    },

    addListeners() {
        PushNotifications.addListener('registration', async (token) => {
            console.log('Push registration success, token: ' + token.value);
            // Save token to Supabase for the current user
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                // Find driver profile linked to this user
                const { data: driver } = await supabase.from('drivers').select('id').eq('user_id', user.id).single();

                if (driver) {
                    await supabase.from('drivers').update({
                        push_token: token.value,
                        platform: Capacitor.getPlatform()
                    }).eq('id', driver.id);
                }
            }
        });

        PushNotifications.addListener('registrationError', (error) => {
            console.error('Error on registration: ' + JSON.stringify(error));
        });

        PushNotifications.addListener('pushNotificationReceived', (notification) => {
            console.log('Push received: ' + JSON.stringify(notification));
            toast({
                title: notification.title || 'New Notification',
                description: notification.body || 'You have a new update',
                type: 'info'
            });
        });

        PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
            console.log('Push action performed: ' + JSON.stringify(notification));
            // Navigate to specific screen if needed
            // e.g. window.location.href = '/orders/' + notification.notification.data.orderId;
        });
    }
};
