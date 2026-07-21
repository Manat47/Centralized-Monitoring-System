import { AssetsTable } from "@/app/features/assets/components/assets-table";
import { CreateAssetDialog } from "@/app/features/assets/components/create-asset-dialog";

export default function AssetsPage() {
  return (
    <section className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Assets</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Infrastructure assets registered in the system.
          </p>
        </div>

        <CreateAssetDialog />
      </div>

      <AssetsTable />
    </section>
  );
}
