import hero from "@/assets/hero.jpg";
import beef from "@/assets/beef.jpg";
import chicken from "@/assets/chicken.jpg";
import burger from "@/assets/burger.jpg";
import fish from "@/assets/fish.jpg";
import pork from "@/assets/pork.jpg";
import platter from "@/assets/platter.jpg";
import drinks from "@/assets/drinks.jpg";

export const images: Record<string, string> = { hero, beef, chicken, burger, fish, pork, platter, drinks };
export const img = (key: string) => images[key] ?? beef;
