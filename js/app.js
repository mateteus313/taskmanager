const verifyServiceWorker = () => {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("/serviceWorker.js")
      .then((registration) => {
        registration.addEventListener("updatefound", () => {
          const installingWorker = registration.installing;
          console.log(
            "A new service worker is being installed:",
            installingWorker,
          );
  
        });
        registration.sync.register('sync-notification');
      })
      .catch((error) => {
        console.error(`Service worker registration failed: ${error}`);
      });
  } else {
    console.error("Service workers are not supported.");
  }
}

let db;
function openIndexedDB() {
  const request = indexedDB.open("task-manager", 1);

  request.onsuccess = (event) => {
    console.log('Success');
    db = event.target.result;

    showContent();
  };

  request.onerror = (event) => {
    console.log('Error', event);
  };

  request.onupgradeneeded = (event) => {
    const db = request.result;
    const objectStore = db.createObjectStore("tasks", {
      keyPath: "id",
      autoIncrement: true,
    });

    objectStore.createIndex("title", "title", { unique: false });
  };
};

window.onscroll = function() {
  scrollFunction();
};

function showContent() {
  var content = document.getElementById("page-content");

  content.innerHTML = `
              <div class="task-list-container">
                  <div class="task-list" ondrop="drop(event)" ondragover="allowDrop(event)">
                  <h2 onclick="collapseList(tasks)">Tasks</h2>
                      <button class="add-btn" onclick="openModal('create')">Add Task</button>
                      <div id="tasks"></div>
                  </div>
                  <div class="task-list" ondrop="drop(event)" ondragover="allowDrop(event)">
                  <div></div>
                  <h2 onclick="collapseList(doing)">Doing</h2>
                  <div id="doing"></div>
                  </div>
                  <div class="task-list" ondrop="drop(event)" ondragover="allowDrop(event)">
                  <div></div>
                      <h2 onclick="collapseList(completed)">Completed</h2>
                      <div id="completed"></div>
                  </div>
              </div>
              <button id="scrollToTopBtn" onclick="scrollToTop()">Go up</button>
          `;
  const transaction   = db.transaction(["tasks"], "readonly");
  const objectStore   = transaction.objectStore("tasks");
  const getAllRequest = objectStore.getAll();

  getAllRequest.onsuccess = function (event) {
    const tasks = event.target.result;

    tasks.forEach((task) => {
      let newItem             = document.createElement("div");
      let editButton          = document.createElement("button");
      let nextTaskButton      = document.createElement("button");
      let expirationDateLabel = document.createElement("span");
      let taskFooterDiv       = document.createElement("div");
      let taskDiv             = document.createElement("div");
      let taskDivTitle        = document.createElement("h2");
      let creationDate        = task["creationDate"];
      let title               = task["title"];
      let type                = task["type"];
      let description         = task["description"];
      let expirationDate      = task["expirationDate"];
      let id                  = task["id"];
      let list                = task["list"];
      let status              = task["status"];

      newItem.setAttribute("draggable", true);
      newItem.setAttribute("ondragstart", "drag(event)");
      newItem.id = id;
      newItem.innerHTML =   `<div class="task-list-header" onclick="hideListItem(${id})">${creationDate}</div>
                            <hr>
                            <strong>${title}</strong>
                            <br>
                            <em>${type}</em>
                            <br>
                            <p>${description}</p>
                            <br>
                            <hr>`;

      editButton.classList.add("task-edit-button");
      editButton.onclick = () => {
        editTask(id);
      };
      editButton.innerHTML = "Edit";

      expirationDateLabel.id = expirationDate;
      expirationDateLabel.innerHTML = convertDate(expirationDate);
      expirationDateLabel.classList.add("expiration-date-label");

      nextTaskButton.innerHTML = ">";
      nextTaskButton.id = `next-task-list-button-${id}`;
      nextTaskButton.onclick = () => {
        nextTaskList(id);
      }
      nextTaskButton.classList.add("next-task-list-button");

      taskFooterDiv.classList.add("task-footer");
      taskFooterDiv.append(editButton, expirationDateLabel, nextTaskButton);

      newItem.append(taskFooterDiv);

      taskDivTitle.innerHTML = title;
      taskDivTitle.style.display = 'none';
      taskDivTitle.classList = "task-div-title";
      taskDiv.id = `task-div-element-${id}`;
      taskDiv.append(taskDivTitle);
      taskDiv.append(newItem);

      syncTask({newItem, task, id, list, status, nextTaskButton, taskDiv});
    });
  };

  getAllRequest.onerror = function (event) {
    alert("Failed to load tasks. Please refresh the page:", event.target.error);
  };
}

function scrollFunction() {
  const scrollToTopBtn = document.getElementById("scrollToTopBtn");

  if (document.body.scrollTop > 100 || document.documentElement.scrollTop > 100) {
    scrollToTopBtn.style.display = "block";
  } else {
    scrollToTopBtn.style.display = "none";
  }
}

function scrollToTop() {
  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

function collapseList(list) {
  const tasksInsideList = list.childNodes;

  for (var i = 0; i < tasksInsideList.length; i++) {
    if (tasksInsideList[i].children[1].classList == 'hidden') {
      tasksInsideList[i].children[0].style.display = 'none';
      tasksInsideList[i].children[1].classList = '';
      tasksInsideList[i].children[1].style.display = 'block';
    } else {
      tasksInsideList[i].children[0].style.display = 'block';
      tasksInsideList[i].children[1].classList = 'hidden';
      tasksInsideList[i].children[1].style.display = 'none';
      tasksInsideList[i].children[0].onclick = '';
      tasksInsideList[i].children[0].onclick = (e) => { showListItem(e.target, e.target.nextSibling) };
    }
  }
}

function hideListItem(item) {
  let _item = document.getElementById(`task-div-element-${item.id}`);
  
  _item.children[0].style.display = 'block';
  _item.children[1].classList = 'hidden';
  _item.children[1].style.display = 'none';
  _item.children[0].onclick = '';
  _item.children[0].onclick = (e) => { showListItem(e.target, e.target.nextSibling) };
}

function showListItem(title, item) {
  title.style.display = 'none';
  item.classList = '';
  item.style.display = 'block';
}

function nextTaskList(id) {
  var transaction     = db.transaction("tasks", "readwrite");
  var objectStore     = transaction.objectStore("tasks");
  var request         = objectStore.get(id);
  
  request.onsuccess = function (event) {
    var objectToUpdate = event.target.result;
    if (objectToUpdate["list"] == "doing-list") { objectToUpdate["list"] = 'completed-list'; }
    if (objectToUpdate["list"] == "todo-list") { objectToUpdate["list"] = 'doing-list'; }
    
    var taskUpdate = objectStore.put(objectToUpdate);
    
    taskUpdate.onerror = (event) => {
      console.log("Error:", event.target.error);
    };
  }
  showContent();
}

function allowDrop(event) {
  event.preventDefault();
}

function drag(event) {
  event.dataTransfer.setData("text", event.target.id);
}

function drop(event) {
  event.preventDefault();
  var data            = event.dataTransfer.getData("text");
  var item            = document.getElementById(`task-div-element-${data}`);
  var isAnList        = event.target.classList.contains("task-list");
  var nextTaskButton  = document.getElementById(`next-task-list-button-${item.id.split('-')[3]}`);

  const isTaskExpired = (item.childNodes[1].style.backgroundColor == 'rgb(255, 167, 167)');

  if (isAnList) {
    event.target.children[2].append(item);

    var listName = '';
    if(event.target.children.tasks && !isTaskExpired) { listName = 'tasks'; nextTaskButton.style.display = 'block' }
    if(event.target.children.doing && !isTaskExpired) { listName = 'doing'; nextTaskButton.style.display = 'block' }
    if(event.target.children.completed) { listName = 'completed'; nextTaskButton.style.display = 'none' }

    if (isTaskExpired) { return; }

    var taskId      = event.target.children[2].lastChild.id.split('-')[3];
    var transaction = db.transaction("tasks", "readwrite");
    var objectStore = transaction.objectStore("tasks");
    var request     = objectStore.get(taskId);

    request.onsuccess = function (event) {
      var objectToUpdate = event.target.result;

      if (listName == 'tasks') {
        objectToUpdate["list"] = 'todo-list';
      }
      if (listName == 'doing') {
        objectToUpdate["list"] = 'doing-list';
      }
      if (listName == 'completed') {
        objectToUpdate["list"] = 'completed-list';
      }
  
      var requestUpdate = objectStore.put(objectToUpdate);
  
      requestUpdate.onerror = (event) => {
        console.log("Error:", event.target.error);
      };

      showContent();
    }
  }
}

function openModal(option) {
  var createTaskButton = document.getElementById("createTask");
  var editTaskButton = document.getElementById("editTask");
  var deleteTaskButton = document.getElementById("deleteTask");

  if (option == "create") {
    createTaskButton.style.display = "";
    editTaskButton.style.display = "none";
    deleteTaskButton.style.display = "none";
    $("#taskModal").modal("show");
    document.querySelector(".modal-title").innerHTML = "Add Task";
  }
  if (option == "edit") {
    createTaskButton.style.display = "none";
    editTaskButton.style.display = "";
    deleteTaskButton.style.display = "";
    $("#taskModal").modal("show");
    document.querySelector(".modal-title").innerHTML = "Edit Task";
  }
}

function editTask(taskId) {
  const transaction        = db.transaction("tasks", "readwrite");
  const objectStore        = transaction.objectStore("tasks");
  const request            = objectStore.get(taskId);
  let taskTitle            = document.getElementById("taskTitle");
  let taskType             = document.getElementById("taskType");
  let taskDescription      = document.getElementById("taskDescription");
  let taskExpirationDate   = document.getElementById("taskExpirationDate");
  
  request.onsuccess = function (event) {
    const objectFromDb        = event.target.result;
    taskTitle.value           = objectFromDb["title"];
    taskType.value            = objectFromDb["type"];
    taskExpirationDate.value  = objectFromDb["expirationDate"];
    taskDescription.value     = objectFromDb["description"];
  };
  
  document.getElementById('editTask').onclick = ''; // reset
  document.getElementById('editTask').onclick = () => {
    let allTheFieldsHasValue = true; 
    if (taskTitle.value !== '' && taskType.value !== '' && taskExpirationDate.value !== '' && taskDescription.value !== '') {
      allTheFieldsHasValue = true;
    } else {
      allTheFieldsHasValue = false;
    }
    if (allTheFieldsHasValue) {
      saveTaskEdition([taskTitle.value, taskType.value, taskExpirationDate.value, taskDescription.value]);
    } else {
      alert("All the fields must have an value!");
    }
  }
  
  document.getElementById("taskId").textContent = taskId;
  openModal("edit");
}

function saveTaskEdition(editedValues) {
  if(editedValues.length !== 4) {
    return alert('All inputs must have an value!');
  }

  const taskId    = document.getElementById("taskId").textContent;
  var transaction = db.transaction("tasks", "readwrite");
  var objectStore = transaction.objectStore("tasks");
  var request     = objectStore.get(taskId);

  request.onsuccess = function (event) {
    const objectToUpdate    = event.target.result;

    objectToUpdate["title"]             = editedValues[0];
    objectToUpdate["type"]              = editedValues[1];
    objectToUpdate["expirationDate"]    = editedValues[2];
    objectToUpdate["description"]       = editedValues[3];

    const requestUpdate = objectStore.put(objectToUpdate);

    requestUpdate.onsuccess = () => {
      alert("Task updated successfully!");
      showContent();
      location.reload();
    };
  };
}

function deleteTask() {
  taskId = document.getElementById("taskId").textContent;
  taskName = document.getElementById(taskId).childNodes[4].textContent;
  
  taskList = document.querySelectorAll(".task-list li");

  if (confirm("Are you sure you want to delete this task?\nTask name: " + taskName)) {
    taskList.forEach((list) => {
      if (list.id == taskId) {
        const request = db.transaction("tasks", "readwrite").objectStore("tasks").delete(list.id);

        request.onsuccess = () => {
          alert("Task deleted successfully.");
        };
        
        request.onerror = (err) => {
          alert("We can not delete this task.");
        };
        
        showContent();
      }
      $("#taskModal").modal("hide");
      clearModal();
    });
  }
}

function saveTask() {
  let title = document.getElementById("taskTitle").value;
  let type = document.getElementById("taskType").value;
  let description = document.getElementById("taskDescription").value;
  let expirationDate = document.getElementById("taskExpirationDate").value;
  let creationDate = new Date().toLocaleString();
  let id = "item" + new Date().getTime();
  let list = 'todo-list';
  let status = 1;

  if (title && type && expirationDate && description) {
    const transaction = db.transaction(["tasks"], "readwrite");
    const objectStore = transaction.objectStore("tasks");
    const task = { id, creationDate, title, type, description, expirationDate, list, status};

    const addRequest = objectStore.add(task);

    addRequest.onsuccess = function () {
      showContent();
    };

    addRequest.onerror = function (event) {
      alert("Failed to save task. Please try again:", event.target.error);
    };

    $("#taskModal").modal("hide");
    clearModal();
  } else {
    alert("Please fill out all fields");
  }
}

function clearModal() {
  document.getElementById("taskTitle").value = "";
  document.getElementById("taskType").value = "";
  document.getElementById("taskExpirationDate").value = "";
  document.getElementById("taskDescription").value = "";
}

function convertDate(dateString) {
  let dateParts = dateString.split("-");
  return [dateParts[2], dateParts[1], dateParts[0]].join("/");
}

function syncTask({newItem, task, id, list, status, nextTaskButton, taskDiv}) {
  const transaction   = db.transaction(["tasks"], "readwrite");
  const objectStore   = transaction.objectStore("tasks");
  const getRequest    = objectStore.get(id);
  const todoList      = document.getElementById("tasks");
  const doingList     = document.getElementById("doing");
  const completedList = document.getElementById("completed");

  getRequest.onsuccess = () => {
    const taskToUpdate = task;

    const currDate = new Date();
    const dateToCheck = new Date(task.expirationDate);

    dateToCheck.setDate(dateToCheck.getDate() + 1);

    let uniqueTodayId = currDate.getFullYear() + currDate.getMonth() + currDate.getDate();
    const uniqueDateToCheckId = dateToCheck.getFullYear() + dateToCheck.getMonth() + dateToCheck.getDate();

    if (uniqueTodayId > uniqueDateToCheckId) {
      taskToUpdate.status = 3;
    }
    if (uniqueTodayId == uniqueDateToCheckId) {
      taskToUpdate.status = 2;
    }
    if (uniqueTodayId < uniqueDateToCheckId) {
        uniqueTodayId += 2;
      
      if (uniqueTodayId > uniqueDateToCheckId) {
        taskToUpdate.status = 2;
      } else {
        taskToUpdate.status = 1;
      }
    }

    switch (status) {
      case 1:
        newItem.style.backgroundColor = 'white';
        break;
      case 2:
        newItem.style.backgroundColor = '#fff87d';
        break;
      case 3:
        newItem.style.backgroundColor = 'rgb(255, 167, 167)';
        nextTaskButton.style.display  = 'none';
        break;
    }

    switch (list) {
      case 'todo-list':
        todoList.appendChild(taskDiv);
        break;
      case 'doing-list':
        doingList.appendChild(taskDiv);
        break;
      case 'completed-list':
        completedList.appendChild(taskDiv);
        newItem.style.backgroundColor = 'rgb(115, 211, 112)';
        nextTaskButton.style.display = 'none';
        break;
    }

    const updateRequest = objectStore.put(taskToUpdate);
  }
}

verifyServiceWorker();
openIndexedDB();