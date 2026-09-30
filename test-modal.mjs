// Mock browser global localStorage before any import
const storage = {
  // Old config from before today's changes:
  'apms_telegram_config_v1': JSON.stringify({
    isEnabled: true,
    botToken: "demo_token",
    defaultChatId: "12345",
    // Note: groupChannelChatId, beforeShiftAlertEnabled, beforeShiftMinutes, beforeShiftTarget, autoSchedulerEnabled are MISSING!
  })
};
globalThis.localStorage = {
  getItem: (k) => storage[k] || null,
  setItem: (k, v) => { storage[k] = String(v); },
  removeItem: (k) => { delete storage[k]; },
  clear: () => { Object.keys(storage).forEach(k => delete storage[k]); },
};

async function run() {
  const React = (await import('react')).default;
  const { renderToString } = await import('react-dom/server');
  const { db } = await import('./src/services/db.js');
  const { TelegramNotificationModal } = await import('./src/components/TelegramNotificationModal.js');

  const user = db.getCurrentUser();
  console.log('Loaded config from DB:', db.getTelegramConfig());

  try {
    const html = renderToString(
      React.createElement(TelegramNotificationModal, {
        isOpen: true,
        onClose: () => {},
        currentUser: user,
        lang: 'en',
        onToast: () => {},
      })
    );
    console.log('SUCCESS! Rendered length:', html.length);
  } catch (err) {
    console.error('CRASH WITH OLD CONFIG:', err);
  }
}

run();
