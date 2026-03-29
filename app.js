(function () {
  const STORAGE_KEY = "task-planner-tasks-v2";

  const form = document.getElementById("task-form");
  const input = document.getElementById("task-input");
  const list = document.getElementById("task-list");
  const empty = document.getElementById("empty-state");
  const calGrid = document.getElementById("cal-grid");
  const calMonthLabel = document.getElementById("cal-month-label");
  const calPrev = document.getElementById("cal-prev");
  const calNext = document.getElementById("cal-next");
  const selectedDateLabel = document.getElementById("selected-date-label");

  const monthFormatter = new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" });
  const longDateFormatter = new Intl.DateTimeFormat("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  let viewYear;
  let viewMonth;
  let selectedDate;

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function toISODate(d) {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }

  function parseISODate(iso) {
    const [y, m, day] = iso.split("-").map(Number);
    return new Date(y, m - 1, day);
  }

  function todayISO() {
    return toISODate(new Date());
  }

  function loadTasks() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return migrateLegacy();
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.map((t) => ({
        id: t.id,
        text: t.text,
        done: Boolean(t.done),
        date: typeof t.date === "string" ? t.date : todayISO(),
      }));
    } catch {
      return [];
    }
  }

  function migrateLegacy() {
    try {
      const raw = localStorage.getItem("task-planner-tasks");
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      const today = todayISO();
      return parsed.map((t) => ({
        id: t.id,
        text: t.text,
        done: Boolean(t.done),
        date: today,
      }));
    } catch {
      return [];
    }
  }

  function saveTasks(tasks) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }

  function countTasksByDate(tasks) {
    const map = Object.create(null);
    for (const t of tasks) {
      const d = t.date || todayISO();
      map[d] = (map[d] || 0) + 1;
    }
    return map;
  }

  function initCalendarState() {
    const now = new Date();
    viewYear = now.getFullYear();
    viewMonth = now.getMonth();
    selectedDate = todayISO();
  }

  function daysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
  }

  function renderCalendar() {
    const tasks = loadTasks();
    const counts = countTasksByDate(tasks);
    const first = new Date(viewYear, viewMonth, 1);
    const startWeekday = (first.getDay() + 6) % 7;
    const totalDays = daysInMonth(viewYear, viewMonth);
    const today = todayISO();

    calMonthLabel.textContent = monthFormatter.format(first);
    calGrid.innerHTML = "";

    const prevMonthDays = daysInMonth(viewYear, viewMonth - 1);
    for (let i = 0; i < startWeekday; i++) {
      const dayNum = prevMonthDays - startWeekday + i + 1;
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "cal-day cal-day--muted";
      cell.textContent = String(dayNum);
      cell.disabled = true;
      calGrid.appendChild(cell);
    }

    for (let d = 1; d <= totalDays; d++) {
      const iso = `${viewYear}-${pad2(viewMonth + 1)}-${pad2(d)}`;
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "cal-day";
      cell.textContent = String(d);
      if (iso === today) cell.classList.add("cal-day--today");
      if (iso === selectedDate) cell.classList.add("cal-day--selected");
      if (counts[iso]) cell.classList.add("cal-day--has-tasks");
      cell.setAttribute(
        "aria-label",
        `${longDateFormatter.format(parseISODate(iso))}${counts[iso] ? ", есть задачи" : ""}`
      );
      cell.addEventListener("click", () => {
        selectedDate = iso;
        renderCalendar();
        renderTasksList();
        updateSelectedLabel();
      });
      calGrid.appendChild(cell);
    }

    const cellsSoFar = startWeekday + totalDays;
    const trailing = (7 - (cellsSoFar % 7)) % 7;
    for (let i = 0; i < trailing; i++) {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "cal-day cal-day--muted";
      cell.textContent = String(i + 1);
      cell.disabled = true;
      calGrid.appendChild(cell);
    }
  }

  function updateSelectedLabel() {
    const d = parseISODate(selectedDate);
    const pretty = longDateFormatter.format(d);
    selectedDateLabel.innerHTML = `Сейчас выбрано: <strong>${pretty}</strong>`;
  }

  function renderTasksList() {
    const all = loadTasks();
    const tasks = all.filter((t) => (t.date || todayISO()) === selectedDate);
    list.innerHTML = "";

    tasks.forEach((task, index) => {
      const li = document.createElement("li");
      li.className = "task-item" + (task.done ? " done" : "");
      li.dataset.id = task.id;
      li.style.animationDelay = `${index * 0.05}s`;

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
      date: selectedDate,
    });
    saveTasks(tasks);
    renderCalendar();
    renderTasksList();
  }

  function toggleDone(id) {
    const tasks = loadTasks();
    const task = tasks.find((t) => t.id === id);
    if (task) {
      task.done = !task.done;
      saveTasks(tasks);
      renderTasksList();
    }
  }

  function removeTask(id) {
    const tasks = loadTasks().filter((t) => t.id !== id);
    saveTasks(tasks);
    renderCalendar();
    renderTasksList();
  }

  calPrev.addEventListener("click", () => {
    viewMonth -= 1;
    if (viewMonth < 0) {
      viewMonth = 11;
      viewYear -= 1;
    }
    renderCalendar();
  });

  calNext.addEventListener("click", () => {
    viewMonth += 1;
    if (viewMonth > 11) {
      viewMonth = 0;
      viewYear += 1;
    }
    renderCalendar();
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    addTask(input.value);
    input.value = "";
    input.focus();
  });

  initCalendarState();
  const existing = loadTasks();
  if (existing.length) saveTasks(existing);
  updateSelectedLabel();
  renderCalendar();
  renderTasksList();
})();

(function () {
  const THEME_KEY = "task-planner-theme";
  const btn = document.getElementById("theme-toggle");
  const label = document.getElementById("theme-toggle-label");

  function getTheme() {
    return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
  }

  function syncThemeUI() {
    const t = getTheme();
    if (label) {
      label.textContent = t === "dark" ? "Тёмная" : "Светлая";
    }
    if (btn) {
      btn.setAttribute(
        "aria-label",
        t === "dark" ? "Переключить на светлую тему" : "Переключить на тёмную тему"
      );
    }
  }

  function toggleTheme() {
    const next = getTheme() === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem(THEME_KEY, next);
    syncThemeUI();
  }

  if (btn) {
    btn.addEventListener("click", toggleTheme);
  }
  syncThemeUI();
})();
