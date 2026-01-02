"use client"

import { useToast as useHookToast } from "@/components/toast-provider"

// We create a custom event based dispatcher for usage outside of React components
// This assumes the main Layout has a listener or we update the Provider to listen to events
// For cleanliness in this codebase without major refactoring, we'll create a singleton-like event emitter
// that the ToastProvider will check, or we simply rely on the hook inside components.
//
// But since the request is to use it from libraries (non-components), we need an external trigger.

class ToastManager {
    static listeners: ((props: any) => void)[] = [];

    static subscribe(listener: (props: any) => void) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    static show(props: any) {
        this.listeners.forEach(l => l(props));
    }
}

export const toast = (props: any) => {
    // If we are in a non-component, dispatch query
    if (typeof window !== 'undefined') {
        const event = new CustomEvent('app-toast', { detail: props });
        window.dispatchEvent(event);
    }
};

export { ToastManager };
