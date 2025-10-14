export const fileToBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.readAsDataURL(file);
    r.onload = () => resolve(String(r.result).split(',')[1] || '');
    r.onerror = reject;
  });

export const isImage = (f: File) => f.type.startsWith('image/');
