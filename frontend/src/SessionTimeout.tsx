import { useEffect, useRef } from "react";

type SessionTimeoutProps = {
  enabled: boolean;
  timeoutMs?: number;
  onTimeout: () => void;
};

export default function SessionTimeout({
  enabled,
  timeoutMs = 90_000,
  onTimeout,
}: SessionTimeoutProps) {
  const timerRef = useRef<number | null>(null);
  const onTimeoutRef = useRef(onTimeout);
  const hasTimedOutRef = useRef(false);

  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  useEffect(() => {
    const clearExistingTimer = () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    if (!enabled) {
      clearExistingTimer();
      hasTimedOutRef.current = false;
      return;
    }

    hasTimedOutRef.current = false;

    const startTimer = () => {
      clearExistingTimer();

      timerRef.current = window.setTimeout(() => {
        if (hasTimedOutRef.current) return;

        hasTimedOutRef.current = true;
        clearExistingTimer();
        onTimeoutRef.current();
      }, timeoutMs);
    };

    const resetTimer = () => {
      if (hasTimedOutRef.current) return;
      startTimer();
    };

    const activityEvents: Array<keyof WindowEventMap> = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
      "click",
      "focus",
    ];

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, resetTimer);
    });

    startTimer();

    return () => {
      clearExistingTimer();

      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, resetTimer);
      });
    };
  }, [enabled, timeoutMs]);

  return null;
}
