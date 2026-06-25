"use client";
import { useState } from "react";

export default function ImgFade({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  return (
    <>
      {!loaded && <div className="absolute inset-0 skeleton" />}
      <img
        src={src}
        alt={alt}
        onLoad={() => setLoaded(true)}
        className={`${className ?? ""} transition-opacity duration-400 ${loaded ? "opacity-100" : "opacity-0"}`}
      />
    </>
  );
}
