import Image from "next/image";
import { categoryIconImages } from "./categoryIconImages";
import { categoryProductImages } from "./categoryProductImages";

export default function CategoryImageIcon({
  slug,
  size = 28,
  className = "",
  rounded = "rounded-xl",
  fallbackClassName = "",
}: {
  slug: string;
  size?: number;
  className?: string;
  rounded?: string;
  fallbackClassName?: string;
}) {
  const productImg = categoryProductImages[slug];
  const img = productImg || categoryIconImages[slug];

  if (!img) {
    return <span className={fallbackClassName || "sr-only"} />;
  }

  return (
    <span
      className={`flex items-center justify-center overflow-hidden ${rounded} ${className}`}
    >
      <Image
        src={img}
        alt=""
        width={size}
        height={size}
        className={`${productImg ? "object-cover" : "object-contain drop-shadow-sm"}`}
        draggable={false}
      />
    </span>
  );
}

