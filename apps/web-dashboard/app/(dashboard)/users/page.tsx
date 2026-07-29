import { CreateUserDialog } from "@/app/features/users/components/create-user-dialog";
import { UsersTable } from "@/app/features/users/components/users-table";

export default function UsersPage() {
  return (
    <section className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Users</h1>

          <p className="text-muted-foreground">
            Manage administrator and operator accounts.
          </p>
        </div>

        <CreateUserDialog />
      </div>

      <UsersTable />
    </section>
  );
}
