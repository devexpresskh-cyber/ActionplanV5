const storage = {};
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
  const { AttendanceView } = await import('./src/components/AttendanceView.js');

  const users = db.getUsers();
  for (const user of users) {
    try {
      const html = renderToString(
        React.createElement(AttendanceView, {
          currentUser: user,
          lang: 'km',
        })
      );
      console.log('AttendanceView rendered for', user.name, 'HTML len:', html.length);
    } catch (err) {
      console.error('CRASH IN AttendanceView for', user.name, err);
    }
  }
}

run();
