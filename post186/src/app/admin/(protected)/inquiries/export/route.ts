import { isAdmin } from "@/lib/auth";
import { inquiriesToCsv, listInquiries, type InquiryType } from "@/lib/inquiries";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await isAdmin())) return new Response("Unauthorized", { status: 401 });
  const url = new URL(req.url);
  const type = url.searchParams.get("type") ?? "membership";
  if (!["membership", "rental", "general"].includes(type)) return new Response("Unknown type", { status: 400 });
  const csv = inquiriesToCsv(await listInquiries(type as InquiryType));
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="post186-${type}-inquiries-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
