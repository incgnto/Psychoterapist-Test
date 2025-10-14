import { useState } from "react";

export function useAttachments(limitMB = 10) {
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const sizeLimit = limitMB * 1024 * 1024;

  const accept = (file: File) =>
    file.type.startsWith("image/") ||
    file.type === "application/pdf" ||
    file.type.startsWith("text/") ||
    file.type === "application/msword" ||
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  const addFiles = (files: File[]) => {
    const valid = files.filter(f => accept(f) && f.size <= sizeLimit);
    if (valid.length) setAttachedFiles(prev => [...prev, ...valid]);
  };

  const removeAt = (i: number) =>
    setAttachedFiles(prev => prev.filter((_, idx) => idx !== i));

  const clearAll = () => setAttachedFiles([]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(e.target.files || []));
    if (e.target) e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    addFiles(Array.from(e.dataTransfer.files || []));
  };

  return { attachedFiles, addFiles, removeAt, clearAll, handleFileInput, handleDrop };
}
