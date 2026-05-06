/**
 * Service to handle browser notifications
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

export const sendLocalNotification = async (title: string, options?: NotificationOptions) => {
  const hasPermission = await requestNotificationPermission();
  
  if (hasPermission) {
    // Check if service worker registration is available for "push-like" behavior
    // though for simple local testing window.Notification is enough
    new Notification(title, {
      icon: '/vite.svg', // Default icon
      ...options
    });
  } else {
    console.warn('Notification permission not granted');
  }
};
