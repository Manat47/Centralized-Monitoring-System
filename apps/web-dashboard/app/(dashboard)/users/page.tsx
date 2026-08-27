import { CreateUserDialog } from "@/app/features/users/components/create-user-dialog";
import { UsersTable } from "@/app/features/users/components/users-table";

export default function UsersPage() {
  return (
    <section className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
        <div>
          <h1 className="text-2xl font-semibold">Users</h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Manage access, roles, and account lifecycle.
          </p>
        </div>

        <CreateUserDialog />
      </div>

      <UsersTable />
    </section>
  );
}
