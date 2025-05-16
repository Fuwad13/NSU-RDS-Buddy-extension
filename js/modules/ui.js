// UI module for NSU RDS Buddy
// Responsible for UI event handlers & interactions

// Initialize event listeners
window.initEventListeners = function (container, courses, waiverCourses) {
  initTabSwitching(container);
  initSortableTables(container);
  initWhatIfForm(container, courses, waiverCourses);
};

// Initialize tab switching functionality
function initTabSwitching(container) {
  const tabButtons = container.querySelectorAll(".tabs-header button");
  const tabPanels = container.querySelectorAll(".tab-panel");

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const tabId = button.dataset.tabId;

      // Deactivate all tabs and panels
      tabButtons.forEach((btn) => btn.classList.remove("active"));
      tabPanels.forEach((panel) => panel.classList.remove("active"));

      // Activate the selected tab and panel
      button.classList.add("active");
      container.querySelector(`#tab-${tabId}`).classList.add("active");
    });
  });
}

// Initialize sortable tables
function initSortableTables(container) {
  const sortableHeaders = container.querySelectorAll("th.sortable");

  sortableHeaders.forEach((header) => {
    header.addEventListener("click", () => {
      const table = header.closest("table");
      const tbody = table.querySelector("tbody");
      const rows = Array.from(tbody.querySelectorAll("tr"));
      const sortKey = header.dataset.sortKey;

      // Toggle sort direction
      const isAscending = header.classList.toggle("asc");
      header.classList.toggle("desc", !isAscending);

      // Clear sort indicators from other headers
      table.querySelectorAll("th.sortable").forEach((th) => {
        if (th !== header) {
          th.classList.remove("asc", "desc");
        }
      });

      // Sort the rows
      rows.sort((a, b) => {
        const aValue = getCellValue(a, sortKey);
        const bValue = getCellValue(b, sortKey);

        if (isNaN(aValue) || isNaN(bValue)) {
          // String comparison
          const comparison = aValue.localeCompare(bValue);
          return isAscending ? comparison : -comparison;
        } else {
          // Numeric comparison
          const comparison = parseFloat(aValue) - parseFloat(bValue);
          return isAscending ? comparison : -comparison;
        }
      });

      // Re-append the sorted rows
      rows.forEach((row) => tbody.appendChild(row));
    });
  });
}

// Helper function to get cell value for sorting
function getCellValue(row, sortKey) {
  const index = Array.from(row.parentNode.querySelector("tr").cells).findIndex(
    (cell) => cell.dataset.sortKey === sortKey
  );

  const cell = row.cells[index];
  return cell ? cell.textContent.trim() : "";
}

// Initialize "What If" form
function initWhatIfForm(container, courses, waiverCourses) {
  const form = container.querySelector("#whatIfForm");
  const resultContainer = container.querySelector("#whatIfResult");

  if (!form || !resultContainer) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const whatIfGrades = [];

    for (const [courseCode, grade] of formData.entries()) {
      if (grade) {
        whatIfGrades.push({
          courseCode,
          grade,
        });
      }
    }

    // Apply what-if grades
    const modifiedCourses = JSON.parse(JSON.stringify(courses));

    whatIfGrades.forEach((whatIf) => {
      const course = modifiedCourses.find((c) => c.code === whatIf.courseCode);
      if (course) {
        course.grade = whatIf.grade;
      }
    });

    // Calculate new GPA
    const newGpa = calculateGPA(modifiedCourses);
    const originalGpa = calculateGPA(courses);
    const difference = newGpa - originalGpa;

    // Show results
    resultContainer.innerHTML = "";
    resultContainer.appendChild(renderStats(modifiedCourses, waiverCourses));

    const diffElement = document.createElement("div");
    diffElement.className = "gpa-difference";
    diffElement.innerHTML = `
      <p>
        Original CGPA: <strong>${originalGpa.toFixed(2)}</strong><br>
        New CGPA: <strong>${newGpa.toFixed(2)}</strong><br>
        Difference: <strong class="${
          difference >= 0 ? "positive" : "negative"
        }">${difference >= 0 ? "+" : ""}${difference.toFixed(2)}</strong>
      </p>
    `;
    resultContainer.appendChild(diffElement);
  });

  // Reset form to clear results
  form.addEventListener("reset", () => {
    resultContainer.innerHTML = "";
  });
}
