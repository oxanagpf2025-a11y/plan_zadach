(function () {
  const STORAGE_KEY = "task-planner-tasks";

  const form = document.getElementById("task-form");
  const input = document.getElementById("task-input");
  const list = document.getElementById("task-list");
  const empty = document.getElementById("empty-state");

  function loadTasks() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveTasks(tasks) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }

  function render() {
    const tasks = loadTasks();
    list.innerHTML = "";

    tasks.forEach((task) => {
      const li = document.createElement("li");
      li.className = "task-item" + (task.done ? " done" : "");
      li.dataset.id = task.id;

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "task-check";
      checkbox.checked = Boolean(task.done);
      checkbox.setAttribute("aria-label", task.done ? "Отменить выполнение" : "Отметить выполненной");
      checkbox.addEventListener("change", () => {
        toggleDone(task.id);
      });

      const span = document.createElement("span");
      span.className = "task-text";
      span.textContent = task.text;

      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "btn btn-danger task-delete";
      delBtn.textContent = "Удалить";
      delBtn.addEventListener("click", () => removeTask(task.id));

      li.append(checkbox, span, delBtn);
      list.appendChild(li);
    });

    const showEmpty = tasks.length === 0;
    empty.hidden = !showEmpty;
    list.hidden = showEmpty;
  }

  function addTask(text) {
    const trimmed = text.trim();
    if (!trimmed) return;

    const tasks = loadTasks();
    tasks.push({
      id: crypto.randomUUID(),
      text: trimmed,
      done: false,
    });
    saveTasks(tasks);
    render();
  }

  function toggleDone(id) {
    const tasks = loadTasks();
    const task = tasks.find((t) => t.id === id);
    if (task) {
      task.done = !task.done;
      saveTasks(tasks);
      render();
    }
  }

  function removeTask(id) {
    const tasks = loadTasks().filter((t) => t.id !== id);
    saveTasks(tasks);
    render();
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    addTask(input.value);
    input.value = "";
    input.focus();
  });

  render();
})();
