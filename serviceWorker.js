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
    const dateInfo = checkDate(task.expirationDate);

    if (dateInfo == 'tomorrow') {
      self.registration.showNotification('Tarefa Pendente', {
        body: `A tarefa: ${task.title} irá expirar amanhã!`,
        icon: 'images/icons/icon32x32.png'
      });
      setTaskStatus(task, 2);
    } else if (dateInfo == 'almost expired') {
      self.registration.showNotification('Tarefa Pendente', {
        body: `A tarefa: ${task.title} irá expirar hoje!`,
        icon: 'images/icons/icon32x32.png'
      });
      setTaskStatus(task, 2);
    } else if (dateInfo == 'expired') {
      setTaskStatus(task, 3);
    }
  });
}

function checkDate(date) {
  const today         = new Date();
  const dateToCheck   = new Date(date);

  dateToCheck.setDate(dateToCheck.getDate() + 1);

  if (today.getFullYear() === dateToCheck.getFullYear() && today.getMonth() === dateToCheck.getMonth()) {
    if (today.getDate() > dateToCheck.getDate()) { return 'expired'}
    if (today.getDate() == dateToCheck.getDate()) {return 'almost expired'}
    if (today.getDate() < dateToCheck.getDate()) {
      today.setDate(today.getDate() + 2)
      if (today.getDate() > dateToCheck.getDate()) {return 'tomorrow'} else { return 'not expired'}
    }
  }
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

async function setTaskStatus(task , status) {
  const openRequest     = indexedDB.open('task-manager', 1);
  const objectToUpdate  = task;
  objectToUpdate.status = status;
  
  openRequest.onsuccess = event => {
    const db            = event.target.result;
    const transaction   = db.transaction('tasks', 'readwrite');
    const store         = transaction.objectStore('tasks');
    const updateRequest = store.put(objectToUpdate);
    
    updateRequest.onerror = () => {
      console.log('Erro ao atualizar status da tarefa: ' + updateRequest.error);
    }
  }
}