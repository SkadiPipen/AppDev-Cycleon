import { useEffect, useState } from "react";

export function useRefreshCountdown(startTime: string, intervalMinutes: number) {
    const [remaining, setRemaining] = useState("");

    useEffect(() => {
        function calc() {
            const now = new Date();

            // Parse HH:MM
            const [h, m] = startTime.split(":").map(Number);
            const start = new Date();
            start.setHours(h, m, 0, 0);

            const intervalMs = intervalMinutes * 60 * 1000;

            // Find next refresh
            let next = new Date(start.getTime());
            while (next.getTime() <= now.getTime()) {
                next = new Date(next.getTime() + intervalMs);
            }

            const diff = next.getTime() - now.getTime();
            const totalSec = Math.floor(diff / 1000);

            const hrs = Math.floor(totalSec / 3600);
            const mins = Math.floor((totalSec % 3600) / 60);
            const secs = totalSec % 60;

            let parts: string[] = [];

            if (hrs > 0) parts.push(`${hrs}h`);
            if (mins > 0) parts.push(`${mins}m`);
            if (secs > 0) {
                // show seconds only if:
                // - hours and minutes are zero
                // - OR hours exist but minutes = 0
                // - OR minutes exist but hours = 0 and seconds > 0
                if (!(hrs > 0 && mins > 0 && secs > 0 && !(hrs && mins))) {
                    // handled in logic below
                }
            }

            // Apply your exact rules
            let formatted = "";
            if (hrs && mins && secs) {
                formatted = `${hrs}h ${mins}m`;
            } else if (hrs && mins && !secs) {
                formatted = `${hrs}h ${mins}m`;
            } else if (hrs && !mins && secs) {
                formatted = `${hrs}h ${secs}s`;
            } else if (hrs && !mins && !secs) {
                formatted = `${hrs}h`;
            } else if (!hrs && mins && secs) {
                formatted = `${mins}m ${secs}s`;
            } else if (!hrs && mins && !secs) {
                formatted = `${mins}m`;
            } else if (!hrs && !mins && secs) {
                formatted = `${secs}s`;
            } else {
                formatted = "0s";
            }

            setRemaining(formatted);
        }

        calc();
        const timer = setInterval(calc, 1000);
        return () => clearInterval(timer);
    }, [startTime, intervalMinutes]);

    return remaining;
}
