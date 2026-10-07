import { cookies } from "next/headers";

export async function getRequestLocale() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value;
  if (locale === "en" || locale === "ru") {
    return locale;
  }
  return "ru";
}
