import { X, FileText, Image as ImageIcon } from "lucide-react";

export function FilePreview({
  files,
  onRemove,
  getIcon,
}: {
  files: File[];
  onRemove: (i: number) => void;
  getIcon?: (f: File) => JSX.Element;
}) {
  const icon = (f: File) => getIcon?.(f) ?? (f.type.startsWith("image/") ? <ImageIcon className="w-4 h-4" /> : <FileText className="w-4 h-4" />);
  if (!files.length) return null;
  return (
    <div className="mb-3">
      <div className="flex flex-wrap gap-2">
        {files.map((file, i) => (
          <div key={`${file.name}-${i}`} className="flex items-center gap-2 bg-slate-100 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2">
            {icon(file)}
            <span className="text-xs sm:text-sm text-slate-700 max-w-[120px] sm:max-w-[160px] truncate">{file.name}</span>
            <button onClick={() => onRemove(i)} className="text-slate-400 hover:text-red-500 transition-colors" aria-label="Remove file">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
