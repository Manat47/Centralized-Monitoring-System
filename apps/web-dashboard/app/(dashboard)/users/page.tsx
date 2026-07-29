import { UsersTable } from "@/app/features/users/components/users-table";

export default function UsersPage() {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Users</h1>
        <p className="text-muted-foreground">
          Manage administrator and operator accounts.
        </p>
      </div>

      <UsersTable />
    </section>
  );
}
