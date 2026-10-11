import { Package } from "lucide-react";
import { getProductImageUrl } from "../services/productService";

interface ProductThumbnailProps {
  imageUrl?: string | null;
  className?: string;
}

export default function ProductThumbnail({
  imageUrl,
  className = "",
}: ProductThumbnailProps) {
  return (
    <span
      className={`product-thumbnail ${className}`.trim()}
      aria-hidden="true"
    >
      <Package size={17} />
      {imageUrl && (
        <img
          src={getProductImageUrl(imageUrl)}
          alt=""
          loading="lazy"
          onError={(event) => event.currentTarget.remove()}
        />
      )}
    </span>
  );
}