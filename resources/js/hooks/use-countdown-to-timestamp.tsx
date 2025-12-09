import { useEffect, useState } from "react";

export function useCountdownToTimestamp(targetUnix: number) {
    const [remaining, setRemaining] = useState("");

    useEffect(() => {
        function calc() {
            const now = Date.now();
            const diff = targetUnix * 1000 - now; // Unix timestamp in ms
            if (diff <= 0) {
                setRemaining("0s");
                return;
            }

            const totalSec = Math.floor(diff / 1000);
            const hrs = Math.floor(totalSec / 3600);
            const mins = Math.floor((totalSec % 3600) / 60);
            const secs = totalSec % 60;

            // Apply exact rules
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
    }, [targetUnix]);

    return remaining;
}
