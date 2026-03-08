import { useEffect, useRef } from "react";

type SessionTimeoutProps = {
  enabled: boolean;
  timeoutMs?: number;
  warningMs?: number;
  onWarning?: () => void;
  onActive?: () => void;
  onTimeout: () => void;
};

export default function SessionTimeout({
  enabled,
  timeoutMs = 90_000,
  warningMs = 30_000,
  onWarning,
  onActive,
  onTimeout,
}: SessionTimeoutProps) {
  const timeoutTimerRef = useRef<number | null>(null);
  const warningTimerRef = useRef<number | null>(null);
  const onTimeoutRef = useRef(onTimeout);
  const onWarningRef = useRef(onWarning);
  const onActiveRef = useRef(onActive);
  const hasTimedOutRef = useRef(false);
  const warningShownRef = useRef(false);

  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  useEffect(() => {
    onWarningRef.current = onWarning;
  }, [onWarning]);

  useEffect(() => {
    onActiveRef.current = onActive;
  }, [onActive]);

  useEffect(() => {
    const clearTimers = () => {
      if (timeoutTimerRef.current !== null) {
        window.clearTimeout(timeoutTimerRef.current);
        timeoutTimerRef.current = null;
      }

      if (warningTimerRef.current !== null) {
        window.clearTimeout(warningTimerRef.current);
        warningTimerRef.current = null;
      }
    };

    if (!enabled) {
      clearTimers();
      hasTimedOutRef.current = false;
      warningShownRef.current = false;
      return;
    }

    hasTimedOutRef.current = false;
    warningShownRef.current = false;

    const startTimers = () => {
      clearTimers();

      const warningDelay = Math.max(timeoutMs - warningMs, 0);

      warningTimerRef.current = window.setTimeout(() => {
        if (hasTimedOutRef.current || warningShownRef.current) return;

        warningShownRef.current = true;
        onWarningRef.current?.();
      }, warningDelay);

      timeoutTimerRef.current = window.setTimeout(() => {
        if (hasTimedOutRef.current) return;

        hasTimedOutRef.current = true;
        clearTimers();
        onTimeoutRef.current();
      }, timeoutMs);
    };

    const resetTimers = () => {
      if (hasTimedOutRef.current) return;

      if (warningShownRef.current) {
        warningShownRef.current = false;
        onActiveRef.current?.();
      }

      startTimers();
    };

    const activityEvents: Array<keyof WindowEventMap> = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
    ];

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, resetTimers);
    });

    startTimers();

    return () => {
      clearTimers();

      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, resetTimers);
      });
    };
  }, [enabled, timeoutMs, warningMs]);

  return null;
}
