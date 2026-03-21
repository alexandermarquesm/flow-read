import { useState } from "react";
import styles from "./CoverImage.module.css";
import { API_URL } from "../../config";

export const getImageUrl = (url?: string) => {
  if (!url) return "";
  if (url.startsWith(API_URL)) return url; // Already proxied
  return `${API_URL}/api/image?url=${encodeURIComponent(url)}`;
};

export const CoverImage = ({ src, alt, className, style, loading, onError }: any) => {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div className={className} style={{ position: "relative", ...style }}>
      {!isLoaded && (
        <div 
          className={styles.skeleton} 
          style={{ position: "absolute", inset: 0, borderRadius: "inherit" }} 
        />
      )}
      <img
        src={src || undefined}
        alt={alt}
        className={isLoaded ? styles.readyImage : ""}
        style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "inherit", borderRadius: "inherit", opacity: isLoaded ? 1 : 0, transition: "opacity 0.3s" }}
        loading={loading}
        onLoad={() => setIsLoaded(true)}
        onError={(e) => {
          setIsLoaded(true);
          if (onError) onError(e);
        }}
      />
    </div>
  );
};
