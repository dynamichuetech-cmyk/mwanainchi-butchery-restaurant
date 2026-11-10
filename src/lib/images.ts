import hero from "@/assets/hero.jpg";
import beef from "@/assets/beef.jpg";
import chicken from "@/assets/chicken.jpg";
import burger from "@/assets/burger.jpg";
import fish from "@/assets/fish.jpg";
import pork from "@/assets/pork.jpg";
import platter from "@/assets/platter.jpg";
import drinks from "@/assets/drinks.jpg";

export const images: Record<string, string> = { hero, beef, chicken, burger, fish, pork, platter, drinks };
/** Bundled key, or a full URL for an uploaded photo (signed by getCatalog). */
export const img = (key: string) => (/^https?:\/\//.test(key) ? key : images[key] ?? beef);
export const UPLOAD_PREFIX = "upload:";
