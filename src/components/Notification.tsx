import React from 'react';
import { Bell, X } from 'lucide-react';

interface NotificationProps {
  message: string;
  onClose: () => void;
}

export function Notification({ message, onClose }: NotificationProps) {
  return (
    <div className="fixed bottom-4 right-4 bg-green-500 rounded-lg shadow-lg p-6 max-w-lg animate-slide-up">
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0">
          <Bell className="w-8 h-8 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-white text-lg">{message}</p>
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 text-white/80 hover:text-white"
        >
          <X className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}