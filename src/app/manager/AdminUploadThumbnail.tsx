'use client';
import { useEffect, useState } from 'react';
import { Images } from 'lucide-react';

export default function AdminUploadThumbnail({ file }: { file?: File }) {
  const [preview, setPreview] = useState<{ file: File; url: string } | null>(null);
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview({ file, url });
    return () => URL.revokeObjectURL(url);
  }, [file]);
  return <div className="flex h-16 w-12 shrink-0 items-center justify-center overflow-hidden rounded bg-[#edf2eb]">
    {file && preview?.file === file ? <img src={preview.url} alt="" className="h-full w-full object-cover" /> : <Images size={18} className="text-[#9aaba0]" />}
  </div>;
}
