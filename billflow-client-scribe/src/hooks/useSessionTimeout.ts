import { useEffect, useRef } from 'react';

interface UseSessionTimeoutOptions {
    timeoutDuration?: number; // in milliseconds
    onTimeout: () => void;
}

/**
 * Custom hook to handle automatic session timeout after user inactivity
 * @param options Configuration options including timeout duration and callback
 */
export const useSessionTimeout = ({
    timeoutDuration = 10 * 60 * 1000, // Default: 10 minutes
    onTimeout,
}: UseSessionTimeoutOptions) => {
    const timeoutRef = useRef<number | null>(null);

    const resetTimer = () => {
        // Clear existing timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        // Set new timeout
        timeoutRef.current = setTimeout(() => {
            console.log('Session timeout: logging out due to inactivity');
            onTimeout();
        }, timeoutDuration);
    };

    useEffect(() => {
        // Activity events to track
        const events = [
            'mousedown',
            'mousemove',
            'keypress',
            'scroll',
            'touchstart',
            'click',
        ];

        // Reset timer on any user activity
        const handleActivity = () => {
            resetTimer();
        };

        // Add event listeners
        events.forEach((event) => {
            document.addEventListener(event, handleActivity);
        });

        // Initialize timer
        resetTimer();

        // Cleanup
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            events.forEach((event) => {
                document.removeEventListener(event, handleActivity);
            });
        };
    }, [timeoutDuration, onTimeout]);

    return null;
};
