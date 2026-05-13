"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect, useState, useRef, useCallback } from "react";
import { Users, Wifi } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function fmt(ts: number) {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

const TIMER_DURATION = 5 * 60; // 5 minutes in seconds

function CircularTimer({ seconds, total }: { seconds: number; total: number }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const progress = seconds / total;
  const offset = circumference * (1 - progress);

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return (
    <div className="relative w-32 h-32">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
        <circle
          cx="60" cy="60" r={radius} fill="none"
          stroke={progress > 0.3 ? "#34c759" : progress > 0.1 ? "#FF9500" : "#FF3B30"}
          strokeWidth="6" strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-linear"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold tabular-nums text-white">
          {mins}:{secs.toString().padStart(2, "0")}
        </span>
      </div>
    </div>
  );
}

function useTimer(isActive: boolean) {
  const [seconds, setSeconds] = useState(TIMER_DURATION);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isActive) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setSeconds(TIMER_DURATION);
      return;
    }

    intervalRef.current = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) return TIMER_DURATION; // restart at 0
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive]);

  return { seconds };
}

export default function QueueDisplayPage() {
  const params = useParams();
  const token = params.token as string;

  const data = useQuery(api.queueDisplay.getTodayQueueByToken, { token });
  const [time, setTime] = useState(new Date());

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // First non-completed visit is the "active" one — mirrors dashboard order
  const notDone = data?.queue?.filter((q) => q.status !== "completed") ?? [];
  const currentPatient = notDone[0] ?? null;
  const isActive = !!currentPatient;
  const { seconds } = useTimer(isActive);

  if (data === undefined) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center text-white">
        <p className="text-xl opacity-50">Queue not found</p>
      </div>
    );
  }

  const queue = data.queue;
  const waiting = notDone.slice(1); // everyone after the first person
  const done = queue.filter((q) => q.status === "completed").length;
  const totalWaiting = notDone.length;

  return (
    <div className="min-h-screen bg-[#000000] text-white flex flex-col select-none overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-8 lg:px-12 py-5 border-b border-white/[0.04]">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/25">{data.clinicName}</p>
          <p className="text-sm font-semibold text-white/50 mt-0.5">Dr. {data.doctorName}</p>
        </div>
        <div className="text-right">
          <p className="text-4xl font-extralight tabular-nums tracking-tight text-white/90">
            {time.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}
          </p>
          <p className="text-[10px] text-white/20 mt-0.5 tracking-wider">
            {time.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-8 lg:px-12 py-8 gap-10">
        {/* NOW SERVING */}
        <AnimatePresence mode="wait">
          {currentPatient ? (
            <motion.div
              key={currentPatient.patientName}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="w-full max-w-xl text-center"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#34c759] mb-6">
                Now Serving
              </p>

              <div className="relative flex flex-col items-center">
                {/* Timer ring — always shows when a patient is active */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mb-6"
                >
                  <CircularTimer seconds={seconds} total={TIMER_DURATION} />
                </motion.div>

                <motion.p
                  layout
                  className="text-4xl lg:text-5xl font-black tracking-tight mb-2"
                >
                  {currentPatient.patientName}
                </motion.p>
                <p className="text-white/30 text-base tabular-nums">{fmt(currentPatient.time)}</p>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-[11px] text-white/15 mt-3 tracking-wider uppercase"
                >
                  Timer restarts automatically
                </motion.p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center"
            >
              <Users className="w-16 h-16 text-white/[0.06] mx-auto mb-4" />
              <p className="text-2xl font-bold text-white/20">No active patients</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* UP NEXT */}
        <AnimatePresence>
          {waiting.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="w-full max-w-xl"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-white/20 mb-4 text-center">
                Waiting
              </p>
              <div className="space-y-2">
                <AnimatePresence>
                  {waiting.slice(0, 4).map((p, i) => (
                    <motion.div
                      key={p.position}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-4 rounded-2xl bg-white/[0.03] border border-white/[0.05] px-5 py-3.5"
                      style={{ opacity: 1 - i * 0.15 }}
                    >
                      <span className="text-lg font-black text-white/15 w-7 tabular-nums text-center">{p.position}</span>
                      <div className="w-9 h-9 rounded-full bg-white/[0.05] flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-white/40">
                          {p.patientName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-lg font-semibold flex-1 truncate">{p.patientName}</span>
                      <span className="text-sm text-white/20 tabular-nums">{fmt(p.time)}</span>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {waiting.length > 4 && (
                  <p className="text-xs text-white/15 text-center mt-2">
                    +{waiting.length - 4} more
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats */}
        <div className="flex items-center gap-10 mt-4">
          {[
            { label: "Total", value: queue.length, color: "text-white/60" },
            { label: "Done", value: done, color: "text-[#34c759]" },
            { label: "Waiting", value: totalWaiting, color: "text-white/60" },
          ].map((s, i) => (
            <div key={s.label} className="flex items-center gap-10">
              {i > 0 && <div className="w-px h-8 bg-white/[0.06]" />}
              <div className="text-center">
                <p className={`text-3xl font-black tabular-nums ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-white/15 uppercase tracking-wider mt-1">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-center gap-2 py-3 border-t border-white/[0.04]">
        <Wifi className="w-2.5 h-2.5 text-[#34c759]" />
        <span className="text-[10px] text-white/15">Live · auto-refreshes</span>
      </div>
    </div>
  );
}
