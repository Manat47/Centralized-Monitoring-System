"use client";

import Link from "next/link";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Check,
  Clipboard,
  Container,
  ExternalLink,
  Gauge,
  Network,
  Server,
  ShieldCheck,
  Terminal,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import styles from "./getting-started-guide.module.css";

const aptInstallCommand = "sudo apt install prometheus-node-exporter -y";

const aptStartCommand = String.raw`sudo systemctl enable prometheus-node-exporter
sudo systemctl restart prometheus-node-exporter`;

const aptStatusCommand = "systemctl status prometheus-node-exporter";

const dockerCommand = String.raw`docker run -d \
  --name node-exporter \
  --restart unless-stopped \
  --net host \
  --pid host \
  -v "/:/host:ro,rslave" \
  quay.io/prometheus/node-exporter:latest \
  --path.rootfs=/host`;

const dockerStartCommand = String.raw`docker update --restart unless-stopped node-exporter
docker restart node-exporter`;

const dockerStatusCommand = String.raw`docker ps --filter "name=node-exporter"
docker logs --tail 20 node-exporter`;

const verifyLocalCommand = "curl http://localhost:9100/metrics";
const allowNetworkCommand =
  "sudo ufw allow from MONITORING_SERVER_IP to any port 9100 proto tcp";
const verifyRemoteCommand = "curl http://SERVER_IP:9100/metrics";

type InstallMethod = "apt" | "docker";

interface CodeBlockProps {
  code: string;
  id: string;
  label: string;
  onCopy: (id: string, code: string) => Promise<void>;
  copiedId: string | null;
}

function CodeBlock({ code, copiedId, id, label, onCopy }: CodeBlockProps) {
  const copied = copiedId === id;

  return (
    <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950">
      <div className="flex h-10 items-center justify-between border-b border-slate-800 px-3">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Terminal className="size-3.5" />
          {label}
        </div>
        <button
          type="button"
          className="flex size-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          onClick={() => onCopy(id, code)}
          title={copied ? "Copied" : `Copy ${label}`}
        >
          {copied ? (
            <Check className="size-3.5" />
          ) : (
            <Clipboard className="size-3.5" />
          )}
          <span className="sr-only">{copied ? "Copied" : `Copy ${label}`}</span>
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-xs leading-6 text-slate-200">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function SignalNode({
  icon: Icon,
  label,
  detail,
}: {
  icon: LucideIcon;
  label: string;
  detail: string;
}) {
  return (
    <div className={styles.signalNode}>
      <div className="flex size-10 items-center justify-center rounded-lg border border-white/15 bg-white text-slate-950">
        <Icon className="size-5" />
      </div>
      <div>
        <p className="text-sm font-semibold text-white">{label}</p>
        <p className="mt-0.5 text-xs text-slate-400">{detail}</p>
      </div>
    </div>
  );
}

function SignalFlow() {
  return (
    <div className={styles.signalStage}>
      <div className={styles.threadField} aria-hidden="true">
        {/* <span className={styles.threadOne} />
        <span className={styles.threadTwo} />
        <span className={styles.threadThree} /> */}
      </div>

      <div className={styles.signalFlow}>
        <SignalNode icon={Server} label="Your server" detail="Linux host" />
        <div className={styles.connector} aria-hidden="true">
          <span className={styles.signalPulse} />
        </div>
        <SignalNode icon={Gauge} label="Metrics" detail="Port 9100" />
        <div className={styles.connector} aria-hidden="true">
          <span className={styles.signalPulseDelayed} />
        </div>
        <SignalNode
          icon={Network}
          label="Monitoring"
          detail="Verify and collect"
        />
      </div>
    </div>
  );
}

function StepNumber({ children }: { children: string }) {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-white">
      {children}
    </span>
  );
}

export function GettingStartedGuide() {
  const [installMethod, setInstallMethod] = useState<InstallMethod>("apt");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const usesApt = installMethod === "apt";

  async function handleCopy(id: string, code: string) {
    await navigator.clipboard.writeText(code);
    setCopiedId(id);
    window.setTimeout(
      () => setCopiedId((current) => (current === id ? null : current)),
      1800,
    );
  }

  return (
    <>
      <header className="border-b border-slate-200 bg-white px-8 py-6">
        <div className="mx-auto flex max-w-6xl items-start justify-between gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">
              Quick start
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">
              Start monitoring a server
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Install Node Exporter, verify port 9100, and connect the server.
            </p>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-600 sm:flex">
            <Terminal className="size-3.5" />
            Ubuntu / Debian
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-6 px-6 py-6 lg:px-8 lg:py-8">
        <SignalFlow />

        <div className="divide-y divide-slate-200">
          <section className="pb-6">
            <div className="flex items-start gap-4">
              <StepNumber>1</StepNumber>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold text-slate-950">
                  Install Node Exporter
                </h2>

                <div
                  className="mt-4 inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1"
                  role="tablist"
                  aria-label="Installation method"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={installMethod === "apt"}
                    className={cn(
                      "flex h-8 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors",
                      installMethod === "apt"
                        ? "bg-white text-slate-950 shadow-sm"
                        : "text-slate-600 hover:text-slate-950",
                    )}
                    onClick={() => setInstallMethod("apt")}
                  >
                    <Terminal className="size-4" />
                    Ubuntu / Debian
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={installMethod === "docker"}
                    className={cn(
                      "flex h-8 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors",
                      installMethod === "docker"
                        ? "bg-white text-slate-950 shadow-sm"
                        : "text-slate-600 hover:text-slate-950",
                    )}
                    onClick={() => setInstallMethod("docker")}
                  >
                    <Container className="size-4" />
                    Docker
                  </button>
                </div>

                <div className="mt-4" role="tabpanel">
                  <CodeBlock
                    id={usesApt ? "apt-install" : "docker-install"}
                    label={usesApt ? "Install package" : "Create container"}
                    code={usesApt ? aptInstallCommand : dockerCommand}
                    copiedId={copiedId}
                    onCopy={handleCopy}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="py-6">
            <div className="flex items-start gap-4">
              <StepNumber>2</StepNumber>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold text-slate-950">
                  Enable and start
                </h2>
                <div className="mt-4">
                  <CodeBlock
                    id={usesApt ? "apt-start" : "docker-start"}
                    label={
                      usesApt
                        ? "Enable and restart service"
                        : "Apply restart policy and restart"
                    }
                    code={usesApt ? aptStartCommand : dockerStartCommand}
                    copiedId={copiedId}
                    onCopy={handleCopy}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="py-6">
            <div className="flex items-start gap-4">
              <StepNumber>3</StepNumber>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold text-slate-950">
                  Verify the service
                </h2>
                <div className="mt-4">
                  <CodeBlock
                    id={usesApt ? "apt-status" : "docker-status"}
                    label={
                      usesApt ? "Check systemd service" : "Check container"
                    }
                    code={usesApt ? aptStatusCommand : dockerStatusCommand}
                    copiedId={copiedId}
                    onCopy={handleCopy}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="py-6">
            <div className="flex items-start gap-4">
              <StepNumber>4</StepNumber>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold text-slate-950">
                  Verify locally
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  A successful response contains Prometheus metrics beginning
                  with{" "}
                  <span className="font-mono text-xs text-slate-800">
                    node_
                  </span>
                  .
                </p>
                <div className="mt-4">
                  <CodeBlock
                    id="verify-local"
                    label="Run on the monitored server"
                    code={verifyLocalCommand}
                    copiedId={copiedId}
                    onCopy={handleCopy}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="py-6">
            <div className="flex items-start gap-4">
              <StepNumber>5</StepNumber>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold text-slate-950">
                  Allow the monitoring network
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Replace{" "}
                  <span className="font-mono text-xs text-slate-800">
                    MONITORING_SERVER_IP
                  </span>{" "}
                  before running this UFW example. For cloud VMs, apply the same
                  source-IP rule in the security group or network firewall.
                </p>
                <div className="mt-4">
                  <CodeBlock
                    id="allow-network"
                    label="Allow TCP 9100 from monitoring only"
                    code={allowNetworkCommand}
                    copiedId={copiedId}
                    onCopy={handleCopy}
                  />
                </div>
                <div className="mt-3 flex items-start gap-2 text-xs leading-5 text-amber-800">
                  <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
                  Do not expose port 9100 to the public internet.
                </div>
              </div>
            </div>
          </section>

          <section className="py-6">
            <div className="flex items-start gap-4">
              <StepNumber>6</StepNumber>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold text-slate-950">
                  Verify remotely
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Run this from the Monitoring Server and replace{" "}
                  <span className="font-mono text-xs text-slate-800">
                    SERVER_IP
                  </span>{" "}
                  with the monitored server address.
                </p>
                <div className="mt-4">
                  <CodeBlock
                    id="verify-remote"
                    label="Run from the Monitoring Server"
                    code={verifyRemoteCommand}
                    copiedId={copiedId}
                    onCopy={handleCopy}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="pt-6">
            <div className="flex items-start gap-4">
              <StepNumber>7</StepNumber>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold text-slate-950">
                  Connect it to monitoring
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Register an active Server asset, then create and verify its
                  monitoring target using{" "}
                  <span className="font-mono text-xs text-slate-800">
                    HTTP :9100/metrics
                  </span>
                  .
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <Link
                    href="/assets"
                    className={buttonVariants({
                      variant: "outline",
                      className: "h-9 px-4",
                    })}
                  >
                    Register Server
                    <ArrowRight data-icon="inline-end" />
                  </Link>
                  <Link
                    href="/monitoring-targets"
                    className={buttonVariants({ className: "h-9 px-4" })}
                  >
                    Create Target
                    <ArrowRight data-icon="inline-end" />
                  </Link>
                  <span className="text-xs text-slate-500">
                    Admin access required
                  </span>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="flex justify-center">
          <a
            href="https://github.com/prometheus/node_exporter"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 hover:text-blue-900"
          >
            Official Node Exporter documentation
            <ExternalLink className="size-3" />
          </a>
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {copiedId ? "Command copied to clipboard" : ""}
      </p>
    </>
  );
}
