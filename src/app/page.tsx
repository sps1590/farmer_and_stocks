import { redirect } from "next/navigation";
import { getDevice } from "@/lib/device";

export default async function Home() {
  redirect((await getDevice()) ? "/today" : "/welcome");
}
