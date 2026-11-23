import { STAFF_ROLES, getCurrentUser } from "@/lib/auth/dal";
import { rosterCsv } from "@/lib/subscribers/roster";

export const dynamic = "force-dynamic";

/**
 * The list, as a file he can keep.
 *
 * "Shahzad keeps the customers" is the trade that justifies handing ordering
 * to somebody else, and it only means anything if the customers can leave with
 * him. A list he can read on a screen but not take is still being held by
 * whoever runs the screen.
 *
 * Returns 404 rather than 401 to anyone who should not have it. There is no
 * reason to confirm to a stranger that this address exists, and the same
 * reasoning guards the cron route.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user || !STAFF_ROLES.includes(user.role)) {
    return new Response("Not found", { status: 404 });
  }

  const csv = await rosterCsv();
  const stamp = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="shahzads-list-${stamp}.csv"`,
      // Somebody's address list has no business in a cache anywhere.
      "cache-control": "no-store, private",
    },
  });
}
