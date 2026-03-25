'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '@/components/LanguageProvider';

interface DownloadConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function DownloadConfirmDialog({
  isOpen,
  onClose,
  onConfirm
}: DownloadConfirmDialogProps) {
  // 使用 useLanguage hook 获取当前语言和多语言文本
  const { texts } = useLanguage();
  
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const dialogContent = (
    <>
      <div className="fixed inset-0 z-[60] flex items-center justify-center">
        {/* 背景遮罩 */}
        <div 
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        ></div>

        {/* Dialog 内容 */}
        <div 
          className="relative bg-white rounded-lg shadow-2xl mx-4"
          style={{ 
            width: '340px', 
            maxWidth: 'calc(100vw - 32px)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-4">
            {/* 标题文本 */}
            <div className="text-center mb-4">
              <h3 className="text-base font-semibold text-gray-900">
                {texts.downloadConfirm}
              </h3>
            </div>

            {/* 按钮区域 */}
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm font-medium transition-colors"
              >
                {texts.cancel}
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onConfirm();
                }}
                className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
              >
                {texts.download}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  // 使用Portal渲染到body，确保Dialog在最顶层
  if (typeof window !== 'undefined') {
    return createPortal(dialogContent, document.body);
  }
  
  return null;
}

