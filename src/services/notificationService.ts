import { toast } from 'react-hot-toast';

/**
 * Service to handle browser notifications and UI feedback
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.error('This browser does not support desktop notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
};

export const sendLocalNotification = async (title: string, options?: NotificationOptions & { useToast?: boolean, vibrate?: boolean }) => {
  // 1. UI Toast Feedback
  if (options?.useToast !== false) {
    toast(title, {
      icon: options?.icon ? '🔔' : '🧘',
      duration: 3000,
      style: {
        borderRadius: '20px',
        background: '#0f172a',
        color: '#fff',
        fontSize: '12px',
        fontWeight: 'bold',
        padding: '16px 24px',
        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
      },
    });
  }

  // 2. Hardware Vibration
  if (options?.vibrate !== false && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate([100, 50, 100]);
  }

  // 3. System Level Alert
  const hasPermission = await requestNotificationPermission();
  
  if (hasPermission) {
    new Notification(title, {
      icon: '/vite.svg',
      ...options
    });
  } else {
    console.warn('Notification permission not granted for system alert');
  }
};
