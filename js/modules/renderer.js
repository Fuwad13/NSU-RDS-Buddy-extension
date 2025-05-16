window.createContainer = function () {
  const container = document.createElement("div");
  container.id = "nsuBuddy";
  container.className = "nsu-buddy-container";
  return container;
};

// Render a table with the provided columns and data
window.renderTable = function (columns, data, sortable = false) {
  const table = document.createElement("table");
  table.className = "nsu-buddy-table";

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");

  columns.forEach((col) => {
    const th = document.createElement("th");
    th.textContent = col.label;
    if (sortable && col.sortKey) {
      th.classList.add("sortable");
      th.dataset.sortKey = col.sortKey;
    }
    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  data.forEach((item) => {
    const row = document.createElement("tr");
    columns.forEach((col) => {
      const cell = document.createElement("td");

      if (col.render) {
        cell.innerHTML = col.render(item);
      } else if (col.key) {
        cell.textContent = item[col.key] || "";
      }

      if (col.className) {
        cell.className = col.className;
      }

      row.appendChild(cell);
    });
    tbody.appendChild(row);
  });

  table.appendChild(tbody);
  return table;
};

// Render the statistics section
window.renderStats = function (courses, waiverCourses = []) {
  const stats = document.createElement("div");
  stats.className = "nsu-buddy-stats";

  const totalAttemptedCredits = calculateAttemptedCredits(courses);
  const totalCompletedCredits = calculateCompletedCredits(courses);
  const waiverCredits = calculateCompletedCredits(waiverCourses);
  const gpa = calculateGPA(courses);

  stats.innerHTML = `
    <div class="stat-item">
      <div class="stat-value">${gpa.toFixed(2)}</div>
      <div class="stat-label">CGPA</div>
    </div>
    <div class="stat-item">
      <div class="stat-value">${totalCompletedCredits.toFixed(1)}</div>
      <div class="stat-label">Credits Completed</div>
    </div>
    <div class="stat-item">
      <div class="stat-value">${totalAttemptedCredits.toFixed(1)}</div>
      <div class="stat-label">Credits Attempted</div>
    </div>
    <div class="stat-item">
      <div class="stat-value">${(totalCompletedCredits + waiverCredits).toFixed(
        1
      )}</div>
      <div class="stat-label">Total Credits</div>
    </div>
  `;

  return stats;
};

// Render tabs for the extension
window.renderTabs = function (tabs) {
  const tabsContainer = document.createElement("div");
  tabsContainer.className = "nsu-buddy-tabs";

  const tabsHeader = document.createElement("div");
  tabsHeader.className = "tabs-header";

  const tabsContent = document.createElement("div");
  tabsContent.className = "tabs-content";

  tabs.forEach((tab, index) => {
    const tabButton = document.createElement("button");
    tabButton.textContent = tab.label;
    tabButton.dataset.tabId = tab.id;
    if (index === 0) tabButton.classList.add("active");
    tabsHeader.appendChild(tabButton);

    const tabPanel = document.createElement("div");
    tabPanel.className = "tab-panel";
    tabPanel.id = `tab-${tab.id}`;
    if (index === 0) tabPanel.classList.add("active");

    if (tab.content) {
      tabPanel.appendChild(tab.content);
    }

    tabsContent.appendChild(tabPanel);
  });

  tabsContainer.appendChild(tabsHeader);
  tabsContainer.appendChild(tabsContent);

  return tabsContainer;
};

// Render the "What If" form
window.renderWhatIfForm = function (courses) {
  const form = document.createElement("form");
  form.id = "whatIfForm";
  form.className = "what-if-form";

  const heading = document.createElement("h3");
  heading.textContent = "What If Analysis";
  form.appendChild(heading);

  const description = document.createElement("p");
  description.textContent =
    "Modify grades to see how they would affect your CGPA.";
  form.appendChild(description);

  const coursesWithGrades = courses.filter(
    (course) => course.grade && course.grade !== "W" && course.grade !== "I"
  );

  coursesWithGrades.forEach((course) => {
    const courseRow = document.createElement("div");
    courseRow.className = "form-row";

    const courseLabel = document.createElement("label");
    courseLabel.innerHTML = `${course.code} <span class="course-title">${course.title}</span> <span class="current-grade">(${course.grade})</span>`;

    const gradeSelect = document.createElement("select");
    gradeSelect.name = course.code;
    gradeSelect.className = "grade-select";

    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "No Change";
    gradeSelect.appendChild(defaultOption);

    Object.keys({
      A: 4.0,
      "A-": 3.7,
      "B+": 3.3,
      B: 3.0,
      "B-": 2.7,
      "C+": 2.3,
      C: 2.0,
      "C-": 1.7,
      "D+": 1.3,
      D: 1.0,
      F: 0.0,
    }).forEach((grade) => {
      const option = document.createElement("option");
      option.value = grade;
      option.textContent = grade;
      gradeSelect.appendChild(option);
    });

    courseRow.appendChild(courseLabel);
    courseRow.appendChild(gradeSelect);
    form.appendChild(courseRow);
  });

  const submitButton = document.createElement("button");
  submitButton.type = "submit";
  submitButton.textContent = "Calculate";
  submitButton.className = "calculate-button";

  const resetButton = document.createElement("button");
  resetButton.type = "reset";
  resetButton.textContent = "Reset";
  resetButton.className = "reset-button";

  const buttonGroup = document.createElement("div");
  buttonGroup.className = "button-group";
  buttonGroup.appendChild(submitButton);
  buttonGroup.appendChild(resetButton);

  form.appendChild(buttonGroup);

  return form;
};

// Render result container for "What If" results
window.renderWhatIfResult = function () {
  const resultContainer = document.createElement("div");
  resultContainer.id = "whatIfResult";
  resultContainer.className = "what-if-result";
  return resultContainer;
};
