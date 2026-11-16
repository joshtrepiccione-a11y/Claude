import type { Metadata } from "next";
import { ConfirmButton } from "@/components/forms/ConfirmButton";
import { Form, FormAlert, SubmitButton, TextField } from "@/components/forms/Form";
import { AdminTitle, Flash, Panel } from "@/components/admin/ui";
import { addAdminUser, changePassword, removeAdminUser } from "@/lib/actions/admin";
import { MIN_PASSWORD_LENGTH, requireAdmin } from "@/lib/auth";
import { formatTimestamp } from "@/lib/dates";
import { listAdminUsers } from "@/lib/repo";

// Admin pages always load live data after checking the sign-in, so they are allowed to wait.
export const instant = false;

export const metadata: Metadata = { title: "Account" };

export default async function AccountAdmin({ searchParams }: PageProps<"/admin/account">) {
  const admin = await requireAdmin();
  const { saved } = await searchParams;
  const users = await listAdminUsers();
  const passwordHint = `At least ${MIN_PASSWORD_LENGTH} characters. A few unrelated words works well.`;

  return (
    <>
      <AdminTitle title="Account" intro="Your password, and who else can update the website." />
      <Flash saved={saved} />

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Change your password">
          <p className="mb-4 text-[0.9375rem]">Signed in as {admin.email}.</p>
          <Form action={changePassword} className="space-y-4">
            <FormAlert />
            <TextField
              name="currentPassword"
              label="Current password"
              type="password"
              required
              autoComplete="current-password"
            />
            <TextField
              name="newPassword"
              label="New password"
              type="password"
              required
              autoComplete="new-password"
              hint={passwordHint}
            />
            <TextField
              name="confirmPassword"
              label="New password again"
              type="password"
              required
              autoComplete="new-password"
            />
            <SubmitButton className="btn btn-red" pendingLabel="Saving…">
              Change Password
            </SubmitButton>
          </Form>
        </Panel>

        <div className="space-y-6">
          <Panel title="People with access">
            <ul className="divide-y divide-line-soft">
              {users.map((user) => (
                <li key={user.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-bold text-ink">
                      {user.name || user.email}
                      {user.id === admin.id && <span className="badge ml-2">You</span>}
                    </p>
                    <p className="text-[0.9375rem]">
                      {user.email} · added {formatTimestamp(user.createdAt)}
                    </p>
                  </div>
                  {user.id !== admin.id && (
                    <form action={removeAdminUser}>
                      <input type="hidden" name="id" value={user.id} />
                      <ConfirmButton message={`Remove ${user.name || user.email}'s access to the admin area?`}>
                        Remove
                      </ConfirmButton>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Give another officer access">
            <p className="mb-4 text-[0.9375rem]">
              Each officer should have their own sign-in. Share the starting password with them in person and ask
              them to change it. When an officer leaves office, remove their access here.
            </p>
            <Form action={addAdminUser} className="space-y-4">
              <FormAlert />
              <TextField name="name" label="Name" required autoComplete="off" />
              <TextField name="email" label="Email" type="email" required autoComplete="off" />
              <TextField
                name="newPassword"
                label="Starting password"
                type="password"
                required
                autoComplete="new-password"
                hint={passwordHint}
              />
              <SubmitButton className="btn btn-navy" pendingLabel="Adding…">
                Add Officer Access
              </SubmitButton>
            </Form>
          </Panel>
        </div>
      </div>
    </>
  );
}
