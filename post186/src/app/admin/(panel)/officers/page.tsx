import type { Metadata } from "next";
import Link from "next/link";
import { ConfirmButton } from "@/components/forms/ConfirmButton";
import { AdminTitle, Empty, Flash } from "@/components/admin/ui";
import { ChevronDown, ChevronUp, Pencil, Plus, Trash } from "@/components/icons";
import { deleteOfficer, moveOfficer } from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/auth";
import { listOfficers } from "@/lib/repo";
import { OFFICER_GROUPS } from "@/lib/types";

// Admin pages always load live data after checking the sign-in, so they are allowed to wait.
export const instant = false;

export const metadata: Metadata = { title: "Officers" };

export default async function OfficersAdmin({ searchParams }: PageProps<"/admin/officers">) {
  await requireAdmin();
  const { saved } = await searchParams;
  const officers = await listOfficers();
  const groupLabel = (value: string) => OFFICER_GROUPS.find((g) => g.value === value)?.label ?? value;

  return (
    <>
      <AdminTitle
        title="Officers"
        intro="The people listed on the Officers & Contact page, in this order. Update this after each election."
      >
        <Link href="/admin/officers/new" className="btn btn-red">
          <Plus size={18} /> Add an Officer
        </Link>
      </AdminTitle>
      <Flash saved={saved} />

      {officers.length ? (
        <div className="card overflow-x-auto">
          <table className="table">
            <caption className="sr-only">Post officers</caption>
            <thead>
              <tr>
                <th scope="col">Order</th>
                <th scope="col">Officer</th>
                <th scope="col">Contact shown on website</th>
                <th scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {officers.map((officer, index) => (
                <tr key={officer.id}>
                  <td>
                    <div className="flex gap-1">
                      {(["up", "down"] as const).map((direction) => {
                        const disabled = direction === "up" ? index === 0 : index === officers.length - 1;
                        return (
                          <form key={direction} action={moveOfficer}>
                            <input type="hidden" name="id" value={officer.id} />
                            <input type="hidden" name="direction" value={direction} />
                            <button
                              type="submit"
                              disabled={disabled}
                              className="btn btn-quiet btn-sm !px-2"
                              aria-label={`Move ${officer.name} ${direction}`}
                            >
                              {direction === "up" ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
                            </button>
                          </form>
                        );
                      })}
                    </div>
                  </td>
                  <td>
                    <Link href={`/admin/officers/${officer.id}`} className="font-bold text-azure hover:underline">
                      {officer.name}
                    </Link>
                    <span className="block">{officer.title}</span>
                    <span className="badge mt-1">{groupLabel(officer.group)}</span>
                  </td>
                  <td className="text-[0.9375rem]">
                    <span className="block">
                      Email: {officer.email ? (officer.showEmail ? officer.email : "on file, hidden") : "none"}
                    </span>
                    <span className="block">
                      Phone: {officer.phone ? (officer.showPhone ? officer.phone : "on file, hidden") : "none"}
                    </span>
                    <span className="block">Message button: {officer.acceptsMessages ? "on" : "off"}</span>
                  </td>
                  <td>
                    <div className="flex flex-wrap justify-end gap-2">
                      <Link href={`/admin/officers/${officer.id}`} className="btn btn-quiet btn-sm">
                        <Pencil size={15} /> Edit
                      </Link>
                      <form action={deleteOfficer}>
                        <input type="hidden" name="id" value={officer.id} />
                        <ConfirmButton message={`Remove ${officer.name} from the officer list?`}>
                          <Trash size={15} /> Remove
                        </ConfirmButton>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty>
          No officers are listed yet.{" "}
          <Link href="/admin/officers/new" className="link">
            Add the first one
          </Link>
          .
        </Empty>
      )}
    </>
  );
}
