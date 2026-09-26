"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { requireDevice } from "../device";
import { rateLimit } from "../rate-limit";
import { claimRefresh, refreshStatus, runRefresh, type RefreshStatus } from "../refresh";

/**
 * "Update today's price" button. Starts one background scrape of all price
 * sources (or joins the one already running) and returns immediately; the
 * client polls getPriceRefreshStatus() until it finishes.
 */
export async function requestPriceRefresh(): Promise<RefreshStatus & { started: boolean; limited?: boolean }> {
  const device = await requireDevice();
  if (!(await rateLimit(`refresh:${device.id}`, 6, 3600))) return { ...(await refreshStatus()), started: false, limited: true };
  const id = await claimRefresh("button");
  if (id) {
    after(async () => {
      await runRefresh(id);
      revalidatePath("/", "layout");
    });
  }
  return { ...(await refreshStatus()), started: Boolean(id) };
}

export async function getPriceRefreshStatus(): Promise<RefreshStatus> {
  await requireDevice();
  return refreshStatus();
}
