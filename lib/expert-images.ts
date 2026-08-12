import type { Expert } from "@/src/types/expert";

export const DEFAULT_MALE_IMAGE = "/images/experts/expert-male.png";
export const DEFAULT_FEMALE_IMAGE = "/images/experts/expert-female.png";

const BROKEN_IMAGE_PATTERNS: RegExp[] = [
  /^\/images\/experts\/dr-default\.svg$/,
  /^\/images\/experts\/dr-[a-z]+\.svg$/,
  /^\/images\/experts\/dr-[a-z]+-cover\.svg$/,
];

export function isValidExpertImage(imagePath: string | undefined): boolean {
  if (!imagePath) return false;
  if (imagePath === DEFAULT_MALE_IMAGE || imagePath === DEFAULT_FEMALE_IMAGE) return true;
  return !BROKEN_IMAGE_PATTERNS.some((pattern) => pattern.test(imagePath));
}

export function getExpertImage(expert: Expert | { id?: string; gender?: "male" | "female"; profileImage?: string }): string {
  if (expert.profileImage && isValidExpertImage(expert.profileImage)) {
    return expert.profileImage;
  }
  const gender = expert.gender || "male";
  return gender === "female" ? DEFAULT_FEMALE_IMAGE : DEFAULT_MALE_IMAGE;
}
