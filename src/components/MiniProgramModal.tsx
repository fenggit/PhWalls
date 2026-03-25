'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import Image from 'next/image';
import { useLanguage } from '@/components/LanguageProvider';

interface MiniProgramModalProps {
  isOpen: boolean;
  onClose: () => void;
  autoClose?: boolean;
  autoCloseDelay?: number;
}

export default function MiniProgramModal({ 
  isOpen, 
  onClose, 
  autoClose = false,
  autoCloseDelay = 3000 
}: MiniProgramModalProps) {
  const { texts } = useLanguage();
  const [countdown, setCountdown] = useState(autoCloseDelay / 1000);
  const countdownSuffix = texts.autoCloseSuffix;

  useEffect(() => {
    if (isOpen && autoClose) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseDelay);

      // 倒计时
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        clearTimeout(timer);
        clearInterval(interval);
      };
    } else {
      setCountdown(autoCloseDelay / 1000);
    }
  }, [isOpen, autoClose, autoCloseDelay, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="relative bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors duration-200 p-1 rounded-full hover:bg-gray-100"
          aria-label={texts.close}
        >
          <X className="w-6 h-6" />
        </button>

        {/* 标题 */}
        <div className="text-center mb-6">
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            {texts.miniProgram}
          </h3>
        </div>

        {/* 二维码 */}
        <div className="flex justify-center mb-6">
          <div className="relative w-64 h-64 bg-gray-100 rounded-lg overflow-hidden shadow-inner">
            <Image
              src="/mini_program.jpg"
              alt={texts.miniProgram}
              fill
              className="object-contain p-4"
              priority
            />
          </div>
        </div>

        {/* 提示文本 */}
        <div className="text-center">
          <p className="text-sm text-gray-600">
            {texts.scanWechatQR}
          </p>
          {autoClose && countdown > 0 && (
            <p className="text-xs text-gray-400 mt-2">
              {countdown}{countdownSuffix}
            </p>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
