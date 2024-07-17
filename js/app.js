if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    navigator.serviceWorker
      .register("/serviceWorker.js")
      .then((res) => {
        console.log("service worker registered");
        res.sync.register('sync-notification');
      })
      .catch((err) => console.log("service worker not registered", err));
  });
}

function initIndexedDB() {
  const dbName = "task-manager";
  const request = indexedDB.open(dbName, 1); // Version 1

  request.onerror = function (event) {
    console.error("Error opening IndexedDB database:", event.target.error);
  };

  request.onsuccess = function (event) {
    db = event.target.result;
  };

  request.onupgradeneeded = function (event) {
    const db = event.target.result;
    const objectStore = db.createObjectStore("tasks", {
      keyPath: "id",
      autoIncrement: true,
    });
    objectStore.createIndex("title", "title", { unique: false });
  };
}

initIndexedDB();

let db;

function showContent(page) {
  var content = document.getElementById("page-content");
  if (page === "home") {
    content.innerHTML = "<h1>Home</h1><p>Welcome.</p>";
  } else if (page === "task") {
    content.innerHTML = `
                <div class="task-list-container">
                    <div class="task-list" ondrop="drop(event)" ondragover="allowDrop(event)">
                        <h2>Tasks</h2>
                        <button class="add-btn" onclick="openModal('create')">Add Task</button>
                        <ul id="tasks"></ul>
                    </div>
                    <div class="task-list" ondrop="drop(event)" ondragover="allowDrop(event)">
                        <h2>Doing</h2>
                        <ul id="doing"></ul>
                    </div>
                    <div class="task-list" ondrop="drop(event)" ondragover="allowDrop(event)">
                        <h2>Completed</h2>
                        <ul id="completed"></ul>
                    </div>
                </div>
            `;
    const transaction   = db.transaction(["tasks"], "readonly");
    const objectStore   = transaction.objectStore("tasks");
    const getAllRequest = objectStore.getAll();

    getAllRequest.onsuccess = function (event) {
      const tasks       = event.target.result;

      let todoList      = document.getElementById("tasks");
      let doingList     = document.getElementById("doing");
      let completedList = document.getElementById("completed");

      tasks.forEach((task) => {
        var newItem             = document.createElement("li");
        var editButton          = document.createElement("button");
        var expirationDateLabel = document.createElement("span");
        var taskFooterDiv       = document.createElement("div");
        let creationDate        = task["creationDate"];
        let title               = task["title"];
        let type                = task["type"];
        let description         = task["description"];
        let expirationDate      = task["expirationDate"];
        let id                  = task["id"];
        let list                = task["list"];

        newItem.setAttribute("draggable", true);
        newItem.setAttribute("ondragstart", "drag(event)");
        newItem.id = id;
        newItem.innerHTML = `${creationDate}<hr><strong>${title}</strong><br><em>${type}</em><br>${description}<br><hr>`;

        editButton.classList.add("task-edit-button");
        editButton.onclick = (e) => {
          editTask(id);
        };
        editButton.innerHTML = "Edit";

        expirationDateLabel.id = expirationDate;
        expirationDateLabel.innerHTML = convertDate(expirationDate);
        expirationDateLabel.classList.add("expiration-date-label");

        taskFooterDiv.classList.add("task-footer");
        taskFooterDiv.append(editButton, expirationDateLabel);

        newItem.append(taskFooterDiv);

        if(list == 'todo-list') {
          todoList.appendChild(newItem);
        } else if (list == 'doing-list') {
          doingList.appendChild(newItem);
        } else if (list == 'completed-list') {
          completedList.appendChild(newItem);
        }
      });
    };

    getAllRequest.onerror = function (event) {
      console.error(
        "Error retrieving tasks from IndexedDB:",
        event.target.error
      );
      alert("Failed to load tasks. Please refresh the page.");
    };
  }
}

function allowDrop(event) {
  event.preventDefault();
}

function drag(event) {
  event.dataTransfer.setData("text", event.target.id);
}

function drop(event) {
  event.preventDefault();
  var data        = event.dataTransfer.getData("text");
  var item        = document.getElementById(data);
  var isAnList    = event.target.classList.contains("task-list");

  if (isAnList) {
    event.target.appendChild(item);

    var listName = '';
    if(event.target.children.tasks)     { listName = 'tasks'; }
    if(event.target.children.doing)     { listName = 'doing'; }
    if(event.target.children.completed) { listName = 'completed'; }

    var taskId      = event.target.lastChild.id;
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
    const transaction       = db.transaction("tasks", "readwrite");
    const objectStore       = transaction.objectStore("tasks");
    const request           = objectStore.get(taskId);
    let taskTitle           = document.getElementById("taskTitle");
    let taskType            = document.getElementById("taskType");
    let taskDescription     = document.getElementById("taskDescription");
    let taskExpirationDate  = document.getElementById("taskExpirationDate");

    request.onsuccess = function (event) {
        const objectFromDb        = event.target.result;
    
        taskTitle.value           = objectFromDb["title"];
        taskType.value            = objectFromDb["type"];
        taskExpirationDate.value  = objectFromDb["expirationDate"];
        taskDescription.value     = objectFromDb["description"];
    };
    document.getElementById('editTask').onclick = ''; // reset
    document.getElementById('editTask').onclick = (e) => {
        saveTaskEdition([taskTitle.value, taskType.value, taskExpirationDate.value, taskDescription.value]);
    }
    document.getElementById("taskId").textContent = taskId;
    openModal("edit");
}

function saveTaskEdition(editedValues) {
  const taskId    = document.getElementById("taskId").textContent;
  var transaction = db.transaction("tasks", "readwrite");
  var objectStore = transaction.objectStore("tasks");
  var request     = objectStore.get(taskId);

  request.onsuccess = function (event) {
    const objectToUpdate = event.target.result;

    objectToUpdate["title"]             = editedValues[0];
    objectToUpdate["type"]              = editedValues[1];
    objectToUpdate["expirationDate"]    = editedValues[2];
    objectToUpdate["description"]       = editedValues[3];

    const requestUpdate = objectStore.put(objectToUpdate);

    requestUpdate.onsuccess = (event) => {
      alert("Task updated successfully!");
    };

    requestUpdate.onerror = (event) => {
      alert("Error updating task:", event.target.error);
    };
  };

  $("#taskModal").modal("hide");
  showContent("task");
  clearModal();
}

function deleteTask() {
  taskId = document.getElementById("taskId").textContent;
  taskName = document.getElementById(taskId).childNodes[2].textContent;
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
        
        showContent("task");
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

  if (title && expirationDate && description) {
    const transaction = db.transaction(["tasks"], "readwrite");
    const objectStore = transaction.objectStore("tasks");
    const task = { id, creationDate, title, type, description, expirationDate, list};

    const addRequest = objectStore.add(task);

    addRequest.onsuccess = function (event) {
      showContent("task");
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
  document.getElementById("taskType").value = "Work";
  document.getElementById("taskExpirationDate").value = "";
  document.getElementById("taskDescription").value = "";
}

function convertDate(dateString) {
  let dateParts = dateString.split("-");
  let swapped = [dateParts[2], dateParts[1], dateParts[0]];
  return swapped.join("/");
}
