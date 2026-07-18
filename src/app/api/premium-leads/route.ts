import { listPremiumInterest } from "@/lib/db";
import { isAdminToken } from "@/lib/admin";
import { premiumLeadsToCsv } from "@/lib/csv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  if (!isAdminToken(token)) {
    return new Response("forbidden", { status: 403 });
  }

  const csv = premiumLeadsToCsv(listPremiumInterest());
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="toi-premium-leads.csv"',
      "Cache-Control": "no-store",
    },
  });
}
