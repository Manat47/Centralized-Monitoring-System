import type { CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BellRing,
  Gauge,
  HeartPulse,
  Server,
} from "lucide-react";

import styles from "./auth-system-visual.module.css";

interface OrbitTrackProps {
  className: string;
  delay: string;
  direction?: "clockwise" | "counterclockwise";
  duration: string;
  icon: LucideIcon;
  iconClassName: string;
  label: string;
}

function OrbitTrack({
  className,
  delay,
  direction = "clockwise",
  duration,
  icon: Icon,
  iconClassName,
  label,
}: OrbitTrackProps) {
  const animationStyle = {
    "--orbit-delay": delay,
    "--orbit-duration": duration,
  } as CSSProperties;

  return (
    <div
      className={`${styles.orbitTrack} ${styles[direction]} ${className}`}
      style={animationStyle}
    >
      <div className={styles.orbitLine} />
      <div className={styles.orbitCarrier}>
        <div className={styles.orbitAnchor}>
          <div className={styles.orbitContent}>
            <div className={styles.orbitLabel}>
              <Icon className={`size-3.5 ${iconClassName}`} />
              <span>{label}</span>
            </div>
          </div>
        </div>
        <span className={styles.orbitDot} />
      </div>
    </div>
  );
}

export function AuthSystemVisual() {
  return (
    <section className="relative hidden min-h-svh overflow-hidden border-l border-white/10 bg-[#0b0d11] lg:flex lg:flex-col lg:justify-between lg:px-10 lg:py-8 xl:px-14">
      <div className="mx-auto flex w-full max-w-[620px] flex-1 items-center justify-center">
        <div
          className="relative aspect-square w-full max-w-[560px]"
          aria-label="Your systems surrounded by performance, availability, and alert monitoring"
          role="img"
        >
          <div className={styles.ambientRing} />

          <OrbitTrack
            className="inset-[4%]"
            delay="-21s"
            duration="90s"
            icon={Gauge}
            label="Performance"
            iconClassName="text-slate-300"
          />
          <OrbitTrack
            className="inset-[18%]"
            delay="-34s"
            direction="counterclockwise"
            duration="75s"
            icon={HeartPulse}
            label="Availability"
            iconClassName="text-slate-300"
          />
          <OrbitTrack
            className="inset-[32%]"
            delay="-17s"
            duration="60s"
            icon={BellRing}
            label="Alerts"
            iconClassName="text-slate-300"
          />

          <div className={styles.coreHalo} />
          <div className={styles.core}>
            <Server className="size-8" />
          </div>
        </div>
      </div>

      <div className="max-w-xl pb-4">
        <h2 className="max-w-lg text-2xl font-semibold leading-9 text-white">
          See what is happening across your systems.
        </h2>
        <p className="mt-3 max-w-lg text-sm leading-6 text-slate-400">
          Monitor performance, availability, and alerts from one operational view.
        </p>
      </div>
    </section>
  );
}
