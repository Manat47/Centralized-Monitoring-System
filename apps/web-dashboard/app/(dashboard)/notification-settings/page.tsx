import { AdminOnly } from "@/app/features/auth/components/admin-only";
import { MultiChannelSettingsForm } from "@/app/features/notification-settings/components/multi-channel-settings-form";

export default function NotificationSettingsPage() {
  return (
    <AdminOnly
      fallback={
        <p className="text-sm text-muted-foreground">
          Administrator access is required.
        </p>
      }
    >
      <section className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Notification Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure global destinations and routing for alerts. These settings are not assigned by team or monitor.
          </p>
        </div>

        <MultiChannelSettingsForm />
      </section>
    </AdminOnly>
  );
}
