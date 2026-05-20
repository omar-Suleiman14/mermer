import { cookies } from "next/headers";
import { translations, Lang } from "./index";

export async function getServerI18n() {
  const cookieStore = await cookies();
  const langCookie = cookieStore.get("mermer_lang")?.value;
  const lang: Lang = (langCookie === "en" || langCookie === "ar") ? langCookie : "ar";

  const t = (key: string) => {
    return translations[lang]?.[key] ?? translations["en"]?.[key] ?? key;
  };

  const dir: "ltr" | "rtl" = lang === "ar" ? "rtl" : "ltr";

  return { lang, t, dir };
}
