'use client';

export function MessageImages({
  images,
}: {
  images: { data: string; mimeType: string; name: string }[];
}) {
  if (!images?.length) return null;

  return (
    <div className="mb-3 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
      {images.map((img, i) => (
        <figure key={`${img.name}-${i}`} className="relative group">
          <img
            src={`data:${img.mimeType};base64,${img.data}`}
            alt={img.name}
            className="w-full h-auto max-h-64 object-cover rounded-xl ring-1 ring-slate-200
                       transition-shadow group-hover:shadow-md"
          />
          <figcaption className="absolute bottom-0 left-0 right-0 bg-black/45 text-white text-[11px] sm:text-xs px-2 py-1 rounded-b-xl truncate">
            {img.name}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
