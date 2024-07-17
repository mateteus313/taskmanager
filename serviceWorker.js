self.addEventListener('install', event => {
  console.log('Service Worker installed.');
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  console.log('Service Worker activated.');

  return self.clients.claim();
});

self.addEventListener('sync', function(event) {
  event.waitUntil(
    syncTasksAndNotify()
  );
});

async function syncTasksAndNotify() {
  const tasks = await getTasksFromIndexedDB();
  
  tasks.forEach(task => {
    let currentDate = new Date();
    let taskExpirationDate = new Date(task.expirationDate);

    if (currentDate.getDate() == taskExpirationDate.getDate()) {
      self.registration.showNotification('Tarefa Pendente', {
        body: `A tarefa: ${task.title} irá expirar amanhã!`,
        icon: 'images/icons/icon32x32.png'
      });
    }
    if (currentDate.getDate() > taskExpirationDate.getDate()) {
      self.registration.showNotification('Tarefa Pendente', {
        body: `A tarefa: ${task.title} irá expirar hoje!`,
        icon: 'images/icons/icon32x32.png'
      });
    }
  });
}

async function getTasksFromIndexedDB() {
  return new Promise((resolve, reject) => {
    const openRequest = indexedDB.open('task-manager', 1);

    openRequest.onsuccess = event => {
      const db = event.target.result;
      const transaction = db.transaction('tasks', 'readonly');
      const store = transaction.objectStore('tasks');
      const getAllRequest = store.getAll();

      getAllRequest.onsuccess = () => {
        resolve(getAllRequest.result);
      };

      getAllRequest.onerror = () => {
        reject(getAllRequest.error);
      };
    };

    openRequest.onerror = () => {
      reject(openRequest.error);
    };
  });
}