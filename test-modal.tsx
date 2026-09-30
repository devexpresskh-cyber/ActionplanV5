import React from 'react';

// Mock browser global localStorage
const storage: Record<string, string> = {};
(global as any).localStorage = {
  getItem: (k: string) => storage[k] || null,
  setItem: (k: string, v: string) => { storage[k] = v; },
  removeItem: (k: string) => { delete storage[k]; },
  clear: () => { Object.keys(storage).forEach(k => delete storage[k]); },
};

import { renderToString } from 'react-dom/server';
import { TelegramNotificationModal } from './src/components/TelegramNotificationModal';
import { db } from './src/services/db';

try {
  const user = db.getCurrentUser();
  console.log('Current user is:', user?.name, user?.role);
  const html = renderToString(
    <TelegramNotificationModal
      isOpen={true}
      onClose={() => {}}
      currentUser={user}
      lang="en"
      onToast={() => {}}
    />
  );
  console.log('SUCCESS! Rendered characters:', html.length);
} catch (err: any) {
  console.error('CRASH ERROR FOUND:', err);
}
