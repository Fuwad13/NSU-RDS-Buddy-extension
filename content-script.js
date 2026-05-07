(() => {
  if (document.getElementById("whatif-panel")) return;

  // ===== Constants =====
  const gradeMap = {
    A: 4.0, "A-": 3.7,
    "B+": 3.3, B: 3.0, "B-": 2.7,
    "C+": 2.3, C: 2.0, "C-": 1.7,
    "D+": 1.3, D: 1.0,
    F: 0.0,
    W: null, // not counted
    I: null, // not counted
    X: null, // not counted
  };

  // ===== Parser (header-based — robust to extra summary tables) =====
  const root = document.querySelector(".hist-grades");
  if (!root) {
    console.warn("[NSU RDS Buddy] .hist-grades container not found.");
    return;
  }
  const allTables = Array.from(root.querySelectorAll("table"));

  function getHeaders(table) {
    if (!table) return [];
    return Array.from(table.querySelectorAll("thead th")).map((th) =>
      th.textContent.trim().toLowerCase()
    );
  }
  function findTable(predicate) {
    return allTables.find(predicate);
  }

  const summaryTable = findTable((t) => {
    const h = getHeaders(t);
    return h.includes("student name") && h.includes("cgpa");
  });
  const semesterTable = findTable((t) => {
    const h = getHeaders(t);
    return h.includes("semester name") && h.includes("course code") && h.some((x) => x.includes("cr.count"));
  });
  const waiverTable = findTable((t) => {
    if (t === summaryTable || t === semesterTable) return false;
    const h = getHeaders(t);
    return h.includes("course code") && h.includes("course grade") && h.length === 4;
  });
  const transferTable = findTable((t) => {
    if (t === summaryTable || t === semesterTable || t === waiverTable) return false;
    const h = getHeaders(t);
    return h.includes("course code") && h.includes("course title") && h.length === 3;
  });

  function parseTable(table, mapRowFn) {
    if (!table) return [];
    return Array.from(table.querySelectorAll("tbody tr"))
      .filter(
        (row) =>
          !row.classList.contains("divider-td") &&
          !row.classList.contains("summary-row")
      )
      .map((row) => {
        try {
          return mapRowFn(row);
        } catch (error) {
          console.warn("Skipping malformed table row:", error, row);
          return null;
        }
      })
      .filter((item) => item !== null);
  }

  const waiverCourses = parseTable(waiverTable, (row) => {
    const cols = row.querySelectorAll("td");
    if (cols.length < 4) return null;
    return {
      code: cols[0].textContent.trim(),
      credits: parseFloat(cols[1].textContent),
      title: cols[2].textContent.trim(),
      grade: cols[3].textContent.trim() || null,
    };
  });

  const transferCourses = parseTable(transferTable, (row) => {
    const cols = row.querySelectorAll("td");
    if (cols.length < 3) return null;
    return {
      code: cols[0].textContent.trim(),
      credits: parseFloat(cols[1].textContent),
      title: cols[2].textContent.trim(),
    };
  });

  let semesterCourses = parseTable(semesterTable, (row) => {
    const cols = row.querySelectorAll("td");
    if (cols.length < 11) return null;
    return {
      semester: cols[0].textContent.trim() || null,
      year: cols[1].textContent.trim() || null,
      code: cols[2].textContent.trim(),
      section: cols[3].textContent.trim(),
      facultyCode: cols[4].textContent.trim(),
      facultyName: cols[5].textContent.trim(),
      credits: parseFloat(cols[6].textContent),
      title: cols[7].textContent.trim(),
      grade: cols[8].textContent.trim() || null,
      crCount: parseFloat(cols[9].textContent),
      crPassed: parseFloat(cols[10].textContent),
    };
  });

  // Sort courses chronologically (oldest semester first)
  function getSemesterOrder(semesterName) {
    if (!semesterName) return 5;
    const lowerSemester = semesterName.toLowerCase();
    if (lowerSemester.includes("spring")) return 1;
    if (lowerSemester.includes("summer")) return 2;
    if (lowerSemester.includes("fall")) return 3;
    if (lowerSemester.includes("intersession")) return 4;
    return 5;
  }

  // Fill missing semester/year data first
  semesterCourses.forEach((course, index) => {
    if (index > 0) {
      const prevCourse = semesterCourses[index - 1];
      if (!course.semester) course.semester = prevCourse.semester;
      if (!course.year) course.year = prevCourse.year;
    }
  });

  semesterCourses.sort((a, b) => {
    if (!a.year || !b.year) return 0;
    if (!a.semester || !b.semester) return 0;
    const yearDiff = parseInt(a.year) - parseInt(b.year);
    if (yearDiff !== 0) return yearDiff;
    return getSemesterOrder(a.semester) - getSemesterOrder(b.semester);
  });

  if (semesterCourses.length === 0) {
    console.warn("[NSU RDS Buddy] No semester courses parsed; nothing to render.");
    return;
  }

  // ===== UI insertion =====
  let targetElement = document.querySelector(".hist-grades");

  if (targetElement) {
    let mainContainer =
      targetElement.closest(".container-fluid") ||
      targetElement.closest(".container") ||
      targetElement.parentElement;

    if (mainContainer) {
      const calculatorContainer = document.createElement("div");
      calculatorContainer.className = "row";
      calculatorContainer.style.marginTop = "30px";
      calculatorContainer.style.marginBottom = "30px";
      calculatorContainer.style.borderTop = "2px solid #ddd";
      calculatorContainer.style.paddingTop = "20px";

      const panel = document.createElement("div");
      panel.id = "whatif-panel";
      panel.className = "col-md-12";

      panel.innerHTML = `
        <div class="panel panel-primary">
          <div class="panel-heading">
            <h3 class="panel-title">What-If CGPA Calculator</h3>
          </div>
          <div class="panel-body">
            <div class="row">
              <div class="col-md-8">
                <div id="course-inputs-container" style="max-height: 400px; overflow-y: auto; margin-bottom: 15px;"></div>
                <div class="btn-group">
                  <button id="add-course" class="btn btn-success">+ Add New Course</button>
                  <button id="reset-grades" class="btn btn-warning">↻ Reset to Original</button>
                </div>
              </div>
              <div class="col-md-4">
                <div class="well">
                  <p>Wondering how your grades will affect your CGPA? Use this tool to simulate different grades and see how they impact your overall GPA.
                  You can also add new courses with grades to see how much that grade affects your current CGPA</p>
                </div>
                <div class="well">
                  <h4>CGPA Calculation</h4>
                  <p>Current CGPA: <span id="current-cgpa" style="font-weight: bold;">—</span></p>
                  <p>What-If CGPA: <span id="whatif-result" style="font-weight: bold; color: #4285f4; font-size: 1.2em;">—</span></p>
                  <hr>
                  <p><small>Make changes to the grades of existing courses or add new courses to see how they affect your CGPA.</small></p>
                  <p><small>In real cases, you can't retake any courses that have grade B+ or above. I, W, X grades don't contribute to your cgpa calculation.</small></p>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;

      calculatorContainer.appendChild(panel);
      mainContainer.appendChild(calculatorContainer);
      insertChartPanel(calculatorContainer);
    } else {
      insertAfterOriginalContent();
    }
  } else {
    insertAfterOriginalContent();
  }

  function insertChartPanel(afterContainer) {
    const chartContainer = document.createElement("div");
    chartContainer.className = "row";
    chartContainer.style.marginTop = "30px";
    chartContainer.style.marginBottom = "30px";

    const chartPanel = document.createElement("div");
    chartPanel.id = "cgpa-chart-panel";
    chartPanel.className = "col-md-12";

    chartPanel.innerHTML = `
      <div class="panel panel-primary">
        <div class="panel-heading" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
          <h3 class="panel-title">Academic Performance Insights</h3>
          <div id="chart-mode-toggle" role="group" aria-label="Chart mode" style="display: flex; flex-wrap: wrap; gap: 4px;">
            <button type="button" class="btn btn-sm btn-default active" data-mode="both">CGPA &amp; Semester GPA</button>
            <button type="button" class="btn btn-sm btn-default" data-mode="cgpa">CGPA</button>
            <button type="button" class="btn btn-sm btn-default" data-mode="sgpa">Semester GPA</button>
            <button type="button" class="btn btn-sm btn-default" data-mode="distribution">Grade Distribution</button>
            <button type="button" class="btn btn-sm btn-default" data-mode="credits">Credit Load</button>
            <button type="button" class="btn btn-sm btn-default" data-mode="heatmap">Grade Heatmap</button>
            <button type="button" class="btn btn-sm btn-default" data-mode="faculty">Faculty Grades</button>
          </div>
        </div>
        <div class="panel-body">
          <div class="row">
            <div class="col-md-9">
              <div id="cgpa-chart-outer" style="position: relative; height: 320px; overflow-y: auto;">
                <div id="cgpa-chart-wrapper" style="position: relative; height: 100%; min-height: 320px;">
                  <canvas id="cgpa-chart"></canvas>
                </div>
              </div>
              <div id="grade-heatmap" style="display: none; max-height: 420px; overflow-y: auto;"></div>
            </div>
            <div class="col-md-3">
              <div class="well" id="chart-side-panel">
                <h4>CGPA Trends</h4>
                <p>This chart shows how your CGPA has progressed over different semesters.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    chartContainer.appendChild(chartPanel);

    if (afterContainer && afterContainer.parentElement) {
      afterContainer.parentElement.insertBefore(chartContainer, afterContainer.nextSibling);
    } else {
      document.body.appendChild(chartContainer);
    }
  }

  function insertAfterOriginalContent() {
    const calculatorContainer = document.createElement("div");
    calculatorContainer.className = "row";
    calculatorContainer.style.marginTop = "30px";
    calculatorContainer.style.marginBottom = "30px";
    calculatorContainer.style.borderTop = "2px solid #ddd";
    calculatorContainer.style.paddingTop = "20px";
    calculatorContainer.style.width = "100%";
    calculatorContainer.style.maxWidth = "1200px";
    calculatorContainer.style.margin = "30px auto";

    const panel = document.createElement("div");
    panel.id = "whatif-panel";
    panel.className = "col-md-12";

    panel.innerHTML = `
      <div class="panel panel-primary">
        <div class="panel-heading">
          <h3 class="panel-title">What-If CGPA Calculator</h3>
        </div>
        <div class="panel-body">
          <div class="row">
            <div class="col-md-8">
              <div id="course-inputs-container" style="max-height: 400px; overflow-y: auto; margin-bottom: 15px;"></div>
              <div class="btn-group">
                <button id="add-course" class="btn btn-success">+ Add New Course</button>
                <button id="reset-grades" class="btn btn-warning">↻ Reset to Original</button>
              </div>
            </div>
            <div class="col-md-4">
              <div class="well">
                <h4>CGPA Calculation</h4>
                <p>Current CGPA: <span id="current-cgpa" style="font-weight: bold;">—</span></p>
                <p>What-If CGPA: <span id="whatif-result" style="font-weight: bold; color: #4285f4; font-size: 1.2em;">—</span></p>
                <hr>
                <p><small>Make changes to the grades and credit hours to see how they affect your CGPA.</small></p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    calculatorContainer.appendChild(panel);
    document.body.appendChild(calculatorContainer);
    insertChartPanel(calculatorContainer);
  }

  // ===== State =====
  const originalCourses = JSON.parse(JSON.stringify(semesterCourses));

  function calcCurrentCgpa() {
    const validCourses = originalCourses.filter(
      (c) =>
        c.grade &&
        gradeMap[c.grade] !== undefined &&
        gradeMap[c.grade] !== null &&
        c.credits > 0
    );
    const coursesByCode = {};
    validCourses.forEach((course) => {
      if (!coursesByCode[course.code]) coursesByCode[course.code] = [];
      coursesByCode[course.code].push(course);
    });
    const bestGradeCourses = [];
    Object.values(coursesByCode).forEach((courses) => {
      courses.sort((a, b) => (gradeMap[b.grade] || 0) - (gradeMap[a.grade] || 0));
      bestGradeCourses.push(courses[0]);
    });
    const totalPoints = bestGradeCourses.reduce(
      (sum, c) => sum + (gradeMap[c.grade] || 0) * c.credits, 0
    );
    const totalCredits = bestGradeCourses.reduce((sum, c) => sum + c.credits, 0);
    return totalCredits ? (totalPoints / totalCredits).toFixed(2) : "—";
  }

  const currentCGPAValue = calcCurrentCgpa();

  function calcWhatIfCgpa(courses) {
    const validCourses = courses.filter(
      (c) =>
        c.grade &&
        gradeMap[c.grade] !== undefined &&
        gradeMap[c.grade] !== null &&
        c.credits > 0
    );
    const coursesByCode = {};
    validCourses.forEach((course) => {
      if (!coursesByCode[course.code]) coursesByCode[course.code] = [];
      coursesByCode[course.code].push(course);
    });
    const bestGradeCourses = [];
    Object.values(coursesByCode).forEach((courses) => {
      courses.sort((a, b) => (gradeMap[b.grade] || 0) - (gradeMap[a.grade] || 0));
      bestGradeCourses.push(courses[0]);
    });
    const totalPoints = bestGradeCourses.reduce(
      (sum, c) => sum + (gradeMap[c.grade] || 0) * c.credits, 0
    );
    const totalCredits = bestGradeCourses.reduce((sum, c) => sum + c.credits, 0);
    return totalCredits ? (totalPoints / totalCredits).toFixed(2) : "—";
  }

  function renderInputs(courses) {
    const container = document.getElementById("course-inputs-container");
    container.innerHTML = "";

    const table = document.createElement("table");
    table.className = "table table-striped table-hover";
    table.innerHTML = `
      <thead>
        <tr>
          <th>Semester</th>
          <th>Course Code</th>
          <th>Course Title</th>
          <th>Credits</th>
          <th>Grade</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody id="course-inputs"></tbody>
    `;
    container.appendChild(table);

    const tbody = document.getElementById("course-inputs");
    let lastSemesterYear = null;

    courses.forEach((c, i) => {
      const row = document.createElement("tr");

      const isOriginalCourse = originalCourses.some((oc) => oc.code === c.code);
      const originalCourse = originalCourses.find((oc) => oc.code === c.code);
      const isGradeChanged = originalCourse && originalCourse.grade !== c.grade;

      if (isGradeChanged) {
        row.style.backgroundColor = "#fff3cd";
        row.style.borderLeft = "3px solid #ffc107";
      }

      const currentSemesterYear =
        c.semester && c.year ? `${c.semester} ${c.year}` : "";
      const showSemesterInfo =
        currentSemesterYear && currentSemesterYear !== lastSemesterYear;

      if (showSemesterInfo && lastSemesterYear !== null) {
        const dividerRow = document.createElement("tr");
        dividerRow.style.height = "5px";
        dividerRow.style.backgroundColor = "#f8f9fa";
        dividerRow.innerHTML =
          '<td colspan="6" style="padding: 2px; border-top: 2px solid #e9ecef;"></td>';
        tbody.appendChild(dividerRow);
      }

      row.innerHTML = `
        <td style="font-size: 12px; color: #666; ${
          showSemesterInfo ? "font-weight: bold;" : ""
        }">${showSemesterInfo ? currentSemesterYear : ""}</td>
        <td>${c.code || "New Course"}</td>
        <td>${c.title || "New Course Title"}</td>
        <td>
          <input type="number" data-idx="${i}" class="credit-input form-control"
                 value="${c.credits || 0}" min="0" max="5" step="0.5" style="width: 70px"
                 ${isOriginalCourse ? "disabled" : ""}>
        </td>
        <td>
          <select data-idx="${i}" data-code="${c.code}" class="grade-select form-control"
                  style="width: 70px; ${isGradeChanged ? "background-color: #fff3cd; font-weight: bold;" : ""}">
            <option value="">—</option>
            ${Object.keys(gradeMap)
              .map((g) => `<option ${c.grade === g ? "selected" : ""}>${g}</option>`)
              .join("")}
          </select>
        </td>
        <td>
          <div class="btn-group btn-group-sm">
            ${
              isGradeChanged
                ? `<button class="reset-grade btn btn-warning btn-sm" data-idx="${i}" data-original-grade="${originalCourse.grade}" title="Reset to original grade">
                    <span class="glyphicon glyphicon-refresh"></span>
                  </button>`
                : ""
            }
            <button class="remove-course btn btn-danger btn-sm" data-idx="${i}" title="Remove course">
              <span class="glyphicon glyphicon-trash"></span>
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(row);

      if (showSemesterInfo) {
        lastSemesterYear = currentSemesterYear;
      }
    });

    document.getElementById("current-cgpa").innerText = currentCGPAValue;
  }

  // initial render
  renderInputs(semesterCourses);
  document.getElementById("whatif-result").innerText = currentCGPAValue;

  // ===== Event handlers =====
  document.getElementById("whatif-panel").addEventListener("change", (e) => {
    if (
      e.target.classList.contains("grade-select") ||
      e.target.classList.contains("credit-input")
    ) {
      update();
    }
  });

  document.getElementById("whatif-panel").addEventListener("click", (e) => {
    if (
      e.target.classList.contains("remove-course") ||
      e.target.closest(".remove-course")
    ) {
      const button = e.target.classList.contains("remove-course")
        ? e.target
        : e.target.closest(".remove-course");
      const idx = parseInt(button.dataset.idx);
      semesterCourses.splice(idx, 1);
      renderInputs(semesterCourses);
      update();
    }

    if (
      e.target.classList.contains("reset-grade") ||
      e.target.closest(".reset-grade")
    ) {
      const button = e.target.classList.contains("reset-grade")
        ? e.target
        : e.target.closest(".reset-grade");
      const idx = parseInt(button.dataset.idx);
      const originalGrade = button.dataset.originalGrade;
      if (idx >= 0 && idx < semesterCourses.length) {
        semesterCourses[idx].grade = originalGrade;
        renderInputs(semesterCourses);
        update();
      }
    }
  });

  document.getElementById("reset-grades").addEventListener("click", () => {
    semesterCourses = JSON.parse(JSON.stringify(originalCourses));
    renderInputs(semesterCourses);
    document.getElementById("whatif-result").innerText = currentCGPAValue;
    document.getElementById("whatif-result").style.color = "#4285f4";
    const resultElement = document.getElementById("whatif-result");
    resultElement.innerHTML = currentCGPAValue;
  });

  document.getElementById("add-course").addEventListener("click", () => {
    openAddCourseModal();
  });

  // ===== Add Course Modal =====
  function createAddCourseModal() {
    const modalContainer = document.createElement("div");
    modalContainer.id = "add-course-modal";
    modalContainer.style.display = "none";
    modalContainer.style.position = "fixed";
    modalContainer.style.zIndex = "10000";
    modalContainer.style.left = "0";
    modalContainer.style.top = "0";
    modalContainer.style.width = "100%";
    modalContainer.style.height = "100%";
    modalContainer.style.backgroundColor = "rgba(0,0,0,0.5)";
    modalContainer.style.alignItems = "center";
    modalContainer.style.justifyContent = "center";

    modalContainer.innerHTML = `
      <div class="panel panel-primary" style="width: 400px; margin: 100px auto;">
        <div class="panel-heading">
          <h3 class="panel-title">Add New Course</h3>
        </div>
        <div class="panel-body">
          <form id="add-course-form">
            <div class="form-group">
              <label for="new-course-code">Course Code*</label>
              <input type="text" class="form-control" id="new-course-code" placeholder="e.g. CSE115" required>
            </div>
            <div class="form-group">
              <label for="new-course-title">Course Title*</label>
              <input type="text" class="form-control" id="new-course-title" placeholder="e.g. Programming Language-I" required>
            </div>
            <div class="form-group">
              <label for="new-course-credits">Credits*</label>
              <input type="number" class="form-control" id="new-course-credits" min="0" max="5" step="0.5" value="3" required>
            </div>
            <div class="form-group">
              <label for="new-course-grade">Grade*</label>
              <select class="form-control" id="new-course-grade" required>
                <option value="">Select Grade</option>
                ${Object.keys(gradeMap)
                  .map((g) => `<option value="${g}">${g}</option>`)
                  .join("")}
              </select>
            </div>
            <div class="alert alert-danger" id="course-validation-error" style="display: none;">
              Please fill in all required fields.
            </div>
            <div class="text-right">
              <button type="button" class="btn btn-danger" id="cancel-add-course">Cancel</button>
              <button type="submit" class="btn btn-primary" id="confirm-add-course">Add Course</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.appendChild(modalContainer);

    document.getElementById("cancel-add-course").addEventListener("click", closeAddCourseModal);

    // Click on backdrop closes modal
    modalContainer.addEventListener("click", (e) => {
      if (e.target === modalContainer) closeAddCourseModal();
    });

    // ESC closes modal
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modalContainer.style.display === "flex") {
        closeAddCourseModal();
      }
    });

    document.getElementById("add-course-form").addEventListener("submit", (e) => {
      e.preventDefault();

      const codeInput = document.getElementById("new-course-code");
      const titleInput = document.getElementById("new-course-title");
      const creditsInput = document.getElementById("new-course-credits");
      const gradeInput = document.getElementById("new-course-grade");
      const errorEl = document.getElementById("course-validation-error");

      if (!codeInput.value || !titleInput.value || !creditsInput.value || !gradeInput.value) {
        errorEl.textContent = "Please fill in all required fields.";
        errorEl.style.display = "block";
        return;
      }

      const courseCodeRegex = /^[A-Za-z0-9]+$/;
      if (!courseCodeRegex.test(codeInput.value)) {
        errorEl.textContent = "Course code should only contain letters and digits.";
        errorEl.style.display = "block";
        return;
      }

      const formattedCourseCode = codeInput.value.toUpperCase();

      semesterCourses.push({
        code: formattedCourseCode,
        title: titleInput.value,
        credits: parseFloat(creditsInput.value),
        grade: gradeInput.value,
      });

      closeAddCourseModal();
      renderInputs(semesterCourses);
      update();

      // Reset form for next time
      codeInput.value = "";
      titleInput.value = "";
      creditsInput.value = "3";
      gradeInput.value = "";
      errorEl.style.display = "none";
    });
  }

  function openAddCourseModal() {
    const modal = document.getElementById("add-course-modal");
    modal.style.display = "flex";
    setTimeout(() => {
      const codeInput = document.getElementById("new-course-code");
      if (codeInput) codeInput.focus();
    }, 50);
  }

  function closeAddCourseModal() {
    document.getElementById("add-course-modal").style.display = "none";
    const errorEl = document.getElementById("course-validation-error");
    if (errorEl) errorEl.style.display = "none";
  }

  createAddCourseModal();

  // ===== Update CGPA display =====
  function update() {
    const selects = Array.from(
      document.querySelectorAll("#course-inputs .grade-select")
    );
    const credits = Array.from(
      document.querySelectorAll("#course-inputs .credit-input")
    );

    selects.forEach((select) => {
      const idx = parseInt(select.dataset.idx);
      const courseCode = select.dataset.code;
      if (idx >= 0 && idx < semesterCourses.length) {
        semesterCourses[idx].grade = select.value;

        const originalCourse = originalCourses.find((oc) => oc.code === courseCode);
        const isOriginalCourse = !!originalCourse;
        const isGradeChanged = isOriginalCourse && originalCourse.grade !== select.value;

        const row = select.closest("tr");

        if (isGradeChanged) {
          row.style.backgroundColor = "#fff3cd";
          row.style.borderLeft = "3px solid #ffc107";
          select.style.backgroundColor = "#fff3cd";
          select.style.fontWeight = "bold";

          const actionsCell = row.querySelector("td:last-child .btn-group");
          let resetButton = actionsCell.querySelector(".reset-grade");
          if (!resetButton) {
            resetButton = document.createElement("button");
            resetButton.className = "reset-grade btn btn-warning btn-sm";
            resetButton.dataset.idx = idx;
            resetButton.dataset.originalGrade = originalCourse.grade;
            resetButton.title = "Reset to original grade";
            resetButton.innerHTML = '<span class="glyphicon glyphicon-refresh"></span>';
            actionsCell.insertBefore(resetButton, actionsCell.firstChild);
          }
        } else if (isOriginalCourse) {
          row.style.backgroundColor = "";
          row.style.borderLeft = "";
          select.style.backgroundColor = "";
          select.style.fontWeight = "";
          const resetButton = row.querySelector(".reset-grade");
          if (resetButton) resetButton.remove();
        }
      }
    });

    credits.forEach((input) => {
      if (!input.disabled) {
        const idx = parseInt(input.dataset.idx);
        if (idx >= 0 && idx < semesterCourses.length) {
          semesterCourses[idx].credits = parseFloat(input.value) || 0;
        }
      }
    });

    const current = semesterCourses.map((c) => ({
      credits: c.credits || 0,
      grade: c.grade,
      code: c.code,
      title: c.title,
    }));

    const currentCGPA = parseFloat(currentCGPAValue);
    const whatIfCGPA = parseFloat(calcWhatIfCgpa(current));
    const resultElement = document.getElementById("whatif-result");

    if (whatIfCGPA > currentCGPA) {
      const delta = (whatIfCGPA - currentCGPA).toFixed(2);
      resultElement.style.color = "#28a745";
      resultElement.innerHTML = `${whatIfCGPA.toFixed(2)} <span class="badge" style="background-color: #28a745; margin-left: 5px;">+${delta}</span>`;
    } else if (whatIfCGPA < currentCGPA) {
      const delta = (whatIfCGPA - currentCGPA).toFixed(2);
      resultElement.style.color = "#dc3545";
      resultElement.innerHTML = `${whatIfCGPA.toFixed(2)} <span class="badge" style="background-color: #dc3545; margin-left: 5px;">${delta}</span>`;
    } else {
      resultElement.style.color = "#4285f4";
      resultElement.innerHTML = whatIfCGPA.toFixed(2);
    }
  }

  // ===== Chart =====
  let chartInstance = null;
  let chartMode = "both";
  let chartData = null;
  let gradeDistData = null;
  let creditsData = null;
  let facultyData = null;

  const GRADE_ORDER = ["A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "F", "W", "I", "X"];
  const GRADE_COLORS = {
    A: "#28a745", "A-": "#5cb85c",
    "B+": "#2780e3", B: "#4a90e2", "B-": "#7fb3e6",
    "C+": "#f0ad4e", C: "#ec971f", "C-": "#d58512",
    "D+": "#ff9800", D: "#f57c00",
    F: "#d9534f",
    W: "#95a5a6", I: "#7f8c8d", X: "#bdc3c7",
  };

  const CHART_TITLES = {
    both: "CGPA & Semester GPA Progression",
    cgpa: "CGPA Progression by Semester",
    sgpa: "Semester GPA Progression",
    distribution: "Grade Distribution",
    credits: "Credit Load per Semester",
    heatmap: "Grade Heatmap",
    faculty: "Average Grade per Faculty",
  };

  function calculateGradeDistribution(courses) {
    const counts = {};
    courses.forEach((c) => {
      if (c.grade && gradeMap[c.grade] !== undefined) {
        counts[c.grade] = (counts[c.grade] || 0) + 1;
      }
    });
    const grades = [];
    const data = [];
    const colors = [];
    GRADE_ORDER.forEach((g) => {
      if (counts[g]) {
        grades.push(g);
        data.push(counts[g]);
        colors.push(GRADE_COLORS[g]);
      }
    });
    return { grades, data, colors };
  }

  function fillSemesterYear(courses) {
    const copy = JSON.parse(JSON.stringify(courses));
    copy.forEach((c, i) => {
      if (i > 0) {
        if (!c.semester) c.semester = copy[i - 1].semester;
        if (!c.year) c.year = copy[i - 1].year;
      }
    });
    return copy;
  }

  function sortSemesterKeys(keys) {
    return keys.slice().sort((a, b) => {
      const [sa, ya] = a.split(" ");
      const [sb, yb] = b.split(" ");
      const yd = parseInt(ya) - parseInt(yb);
      if (yd !== 0) return yd;
      return getSemesterOrder(sa) - getSemesterOrder(sb);
    });
  }

  function calculateCreditsPerSemester(courses) {
    const filled = fillSemesterYear(courses);
    const groups = {};
    filled.forEach((c) => {
      if (!c.semester || !c.year) return;
      if (!c.credits || c.credits <= 0) return;
      const key = `${c.semester} ${c.year}`;
      groups[key] = (groups[key] || 0) + c.credits;
    });
    const semesters = sortSemesterKeys(Object.keys(groups));
    return {
      semesters,
      credits: semesters.map((k) => +groups[k].toFixed(1)),
    };
  }

  function calculateFacultyStats(courses) {
    const stats = {};
    courses.forEach((c) => {
      if (!c.facultyName || !c.facultyName.trim()) return;
      const gp = gradeMap[c.grade];
      if (gp === undefined || gp === null) return; // skip W/I/X & missing
      if (!c.credits || c.credits <= 0) return;

      const name = c.facultyName.trim();
      if (!stats[name]) stats[name] = { totalPoints: 0, totalCredits: 0, count: 0, courses: [] };
      stats[name].totalPoints += gp * c.credits;
      stats[name].totalCredits += c.credits;
      stats[name].count += 1;
      stats[name].courses.push(`${c.code} (${c.grade})`);
    });

    return Object.entries(stats)
      .map(([name, s]) => ({
        name,
        avg: s.totalCredits > 0 ? +(s.totalPoints / s.totalCredits).toFixed(2) : 0,
        count: s.count,
        courses: s.courses,
      }))
      .sort((a, b) => b.avg - a.avg);
  }

  function calculateSemesterCGPA(courses) {
    const coursesCopy = JSON.parse(JSON.stringify(courses));
    coursesCopy.forEach((course, index) => {
      if (index > 0) {
        const prevCourse = coursesCopy[index - 1];
        if (!course.semester) course.semester = prevCourse.semester;
        if (!course.year) course.year = prevCourse.year;
      }
    });

    const semesterGroups = {};
    const semesterKeys = new Set();

    coursesCopy.forEach((course) => {
      const gradePoint = gradeMap[course.grade];
      if (!course.grade || gradePoint === undefined || gradePoint === null) return;
      const key =
        course.semester && course.year
          ? `${course.semester} ${course.year}`
          : "Unknown";
      if (!semesterGroups[key]) semesterGroups[key] = [];
      semesterGroups[key].push(course);
      semesterKeys.add(key);
    });

    const semesterOrder = Array.from(semesterKeys)
      .filter((key) => key !== "Unknown")
      .sort((a, b) => {
        const [semesterA, yearA] = a.split(" ");
        const [semesterB, yearB] = b.split(" ");
        const yearDiff = parseInt(yearA) - parseInt(yearB);
        if (yearDiff !== 0) return yearDiff;
        return getSemesterOrder(semesterA) - getSemesterOrder(semesterB);
      });
    if (semesterKeys.has("Unknown")) semesterOrder.push("Unknown");

    const semesters = [];
    const cgpaValues = [];
    const totalCredits = [];
    const courseCounts = [];
    const semesterCredits = [];
    const semesterGPAs = [];

    let bestGradesByCourseCode = {};

    semesterOrder.forEach((semesterKey) => {
      const semCourses = semesterGroups[semesterKey];
      let semesterTotalCredits = 0;
      let semesterTotalPoints = 0;
      const semesterBestGrades = {};

      semCourses.forEach((course) => {
        if (
          course.grade &&
          gradeMap[course.grade] !== undefined &&
          gradeMap[course.grade] !== null &&
          course.credits > 0
        ) {
          const coursePoints = gradeMap[course.grade] * course.credits;
          semesterTotalPoints += coursePoints;
          semesterTotalCredits += course.credits;

          const code = course.code;
          if (
            !semesterBestGrades[code] ||
            gradeMap[course.grade] > gradeMap[semesterBestGrades[code].grade]
          ) {
            semesterBestGrades[code] = course;
          }
          if (
            !bestGradesByCourseCode[code] ||
            gradeMap[course.grade] > gradeMap[bestGradesByCourseCode[code].grade]
          ) {
            bestGradesByCourseCode[code] = course;
          }
        }
      });

      let cumulativePoints = 0;
      let cumulativeCredits = 0;
      Object.values(bestGradesByCourseCode).forEach((course) => {
        cumulativePoints += gradeMap[course.grade] * course.credits;
        cumulativeCredits += course.credits;
      });

      const semesterGPA =
        semesterTotalCredits > 0 ? semesterTotalPoints / semesterTotalCredits : 0;
      const cgpa =
        cumulativeCredits > 0 ? cumulativePoints / cumulativeCredits : 0;

      semesters.push(semesterKey);
      cgpaValues.push(parseFloat(cgpa.toFixed(2)));
      totalCredits.push(cumulativeCredits);
      semesterCredits.push(semesterTotalCredits);
      courseCounts.push(semCourses.length);
      semesterGPAs.push(parseFloat(semesterGPA.toFixed(2)));
    });

    return {
      semesters,
      cgpaValues,
      totalCredits,
      courseCounts,
      semesterCredits,
      semesterGPAs,
    };
  }

  function buildChartConfig(data) {
    const cgpaDataset = {
      label: "CGPA",
      data: data.cgpaValues,
      backgroundColor: "rgba(54, 162, 235, 0.2)",
      borderColor: "rgba(54, 162, 235, 1)",
      borderWidth: 2,
      pointBackgroundColor: "rgba(54, 162, 235, 1)",
      pointRadius: 5,
      tension: 0.1,
      fill: chartMode === "cgpa",
      hidden: chartMode === "sgpa",
    };

    const sgpaDataset = {
      label: "Semester GPA",
      data: data.semesterGPAs,
      backgroundColor: "rgba(40, 167, 69, 0.15)",
      borderColor: "rgba(40, 167, 69, 1)",
      borderWidth: 2,
      borderDash: [6, 4],
      pointBackgroundColor: "rgba(40, 167, 69, 1)",
      pointRadius: 4,
      tension: 0.1,
      fill: chartMode === "sgpa",
      hidden: chartMode === "cgpa",
    };

    const visibleValues = []
      .concat(chartMode !== "sgpa" ? data.cgpaValues : [])
      .concat(chartMode !== "cgpa" ? data.semesterGPAs : [])
      .filter((v) => v > 0);
    const minV = Math.min(...visibleValues);
    const maxV = Math.max(...visibleValues);
    const range = maxV - minV;
    const buffer = Math.max(0.2, range * 0.15);
    const yMin = Math.max(0, Math.floor((minV - buffer) * 10) / 10);
    const yMax = Math.min(4.0, Math.ceil((maxV + buffer) * 10) / 10);
    const visibleRange = yMax - yMin;
    let stepSize = 0.5;
    if (visibleRange <= 0.5) stepSize = 0.1;
    else if (visibleRange <= 1) stepSize = 0.2;
    else if (visibleRange <= 2) stepSize = 0.25;

    return {
      type: "line",
      data: {
        labels: data.semesters,
        datasets: [cgpaDataset, sgpaDataset],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        scales: {
          y: {
            beginAtZero: false,
            min: yMin,
            max: yMax,
            ticks: {
              callback: (v) => v.toFixed(1),
              stepSize: stepSize,
            },
            title: { display: true, text: "GPA" },
            grid: {
              color: (ctx) =>
                ctx.tick && ctx.tick.value === 4
                  ? "rgba(0, 0, 0, 0.8)"
                  : "rgba(0, 0, 0, 0.1)",
              lineWidth: (ctx) =>
                ctx.tick && ctx.tick.value === 4 ? 1.5 : 1,
            },
          },
          x: { title: { display: true, text: "Semester" } },
        },
        plugins: {
          tooltip: {
            callbacks: {
              title: (ctxs) =>
                data.semesters[ctxs[0].dataIndex] || "Unknown Semester",
              afterTitle: (ctxs) => {
                const idx = ctxs[0].dataIndex;
                return `Semester GPA: ${data.semesterGPAs[idx]}, Courses: ${data.courseCounts[idx]}, Semester Credits: ${data.semesterCredits[idx]}, Total Credits: ${data.totalCredits[idx]}`;
              },
              label: (ctx) => {
                let label = ctx.dataset.label || "";
                if (label) label += ": ";
                if (ctx.parsed.y !== null) label += ctx.parsed.y.toFixed(2);
                return label;
              },
            },
          },
          legend: { position: "top" },
          title: { display: true, text: CHART_TITLES[chartMode] || "CGPA Progression by Semester" },
        },
      },
    };
  }

  function buildPieChartConfig(distData) {
    const total = distData.data.reduce((a, b) => a + b, 0);
    return {
      type: "doughnut",
      data: {
        labels: distData.grades,
        datasets: [
          {
            data: distData.data,
            backgroundColor: distData.colors,
            borderColor: "#ffffff",
            borderWidth: 2,
            hoverOffset: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "right",
            labels: { boxWidth: 14, padding: 10 },
          },
          title: { display: true, text: CHART_TITLES.distribution },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const value = ctx.parsed;
                const pct = total > 0 ? ((value / total) * 100).toFixed(1) : "0.0";
                return `${ctx.label}: ${value} course${value !== 1 ? "s" : ""} (${pct}%)`;
              },
            },
          },
        },
      },
    };
  }

  function buildCreditsBarConfig(data) {
    return {
      type: "bar",
      data: {
        labels: data.semesters,
        datasets: [
          {
            label: "Credits",
            data: data.credits,
            backgroundColor: "rgba(54, 162, 235, 0.7)",
            borderColor: "rgba(54, 162, 235, 1)",
            borderWidth: 1,
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: "Credits" },
            ticks: { stepSize: 3 },
          },
          x: { title: { display: true, text: "Semester" } },
        },
        plugins: {
          legend: { display: false },
          title: { display: true, text: CHART_TITLES.credits },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.parsed.y} credit${ctx.parsed.y !== 1 ? "s" : ""}`,
            },
          },
        },
      },
    };
  }

  function buildFacultyBarConfig(data) {
    const colorFor = (avg) => {
      if (avg >= 3.7) return "rgba(40, 167, 69, 0.75)";
      if (avg >= 3.0) return "rgba(54, 162, 235, 0.75)";
      if (avg >= 2.0) return "rgba(255, 193, 7, 0.75)";
      return "rgba(220, 53, 69, 0.75)";
    };
    return {
      type: "bar",
      data: {
        labels: data.map((d) => d.name),
        datasets: [
          {
            label: "Average GPA",
            data: data.map((d) => d.avg),
            backgroundColor: data.map((d) => colorFor(d.avg)),
            borderWidth: 0,
            borderRadius: 4,
          },
        ],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            beginAtZero: true,
            max: 4.0,
            title: { display: true, text: "Average GPA" },
            ticks: { stepSize: 0.5 },
          },
          y: {
            ticks: { autoSkip: false, font: { size: 11 } },
          },
        },
        plugins: {
          legend: { display: false },
          title: { display: true, text: CHART_TITLES.faculty },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const item = data[ctx.dataIndex];
                return [
                  `Average GPA: ${item.avg.toFixed(2)}`,
                  `Courses: ${item.count}`,
                ].concat(item.courses.map((c) => `  • ${c}`));
              },
            },
          },
        },
      },
    };
  }

  function renderHeatmap(courses, container) {
    const filled = fillSemesterYear(courses);
    const groups = {};
    filled.forEach((c) => {
      if (!c.semester || !c.year) return;
      const key = `${c.semester} ${c.year}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(c);
    });
    const semesters = sortSemesterKeys(Object.keys(groups));

    if (semesters.length === 0) {
      container.innerHTML = '<div class="alert alert-warning" style="margin: 10px;">No grade data to display.</div>';
      return;
    }

    const escapeHtml = (s) =>
      String(s || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

    const html = semesters
      .map((key) => {
        const cells = groups[key]
          .map((c) => {
            const color = GRADE_COLORS[c.grade] || "#bdc3c7";
            const tip = `${c.code} - ${c.title} (${c.grade || "—"})`;
            return `<div title="${escapeHtml(tip)}" style="display:inline-flex;flex-direction:column;align-items:center;justify-content:center;background:${color};color:#fff;border-radius:6px;padding:6px 10px;margin:3px;font-size:11px;min-width:64px;font-weight:600;text-align:center;cursor:default;">
              <div style="font-size:11px;line-height:1.1;">${escapeHtml(c.code)}</div>
              <div style="font-size:14px;margin-top:2px;">${escapeHtml(c.grade || "—")}</div>
            </div>`;
          })
          .join("");

        return `<div style="display:flex;align-items:center;border-bottom:1px solid #eee;padding:8px 4px;">
          <div style="width:140px;flex-shrink:0;font-weight:600;color:#555;font-size:13px;">${escapeHtml(key)}</div>
          <div style="flex:1;display:flex;flex-wrap:wrap;">${cells}</div>
        </div>`;
      })
      .join("");

    container.innerHTML = `<div style="padding: 4px 8px;">${html}</div>`;
  }

  function renderCGPAChart() {
    const ctx = document.getElementById("cgpa-chart");
    const heatmapDiv = document.getElementById("grade-heatmap");
    const chartOuter = document.getElementById("cgpa-chart-outer");
    const chartWrapper = document.getElementById("cgpa-chart-wrapper");
    if (!ctx || !heatmapDiv || !chartOuter || !chartWrapper) return;

    if (typeof Chart === "undefined") {
      const panel = document.getElementById("cgpa-chart-panel");
      if (panel) panel.innerHTML =
        '<div class="alert alert-danger">Chart.js library not available. Please refresh the page.</div>';
      return;
    }

    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }

    // Heatmap mode: hide canvas wrapper, show heatmap div
    if (chartMode === "heatmap") {
      chartOuter.style.display = "none";
      heatmapDiv.style.display = "block";
      renderHeatmap(originalCourses, heatmapDiv);
      updateSidePanel(chartMode);
      return;
    }

    chartOuter.style.display = "";
    heatmapDiv.style.display = "none";

    // Faculty mode needs taller canvas to fit all bars
    if (chartMode === "faculty") {
      const rows = (facultyData && facultyData.length) || 0;
      chartWrapper.style.height = Math.max(320, rows * 26) + "px";
    } else {
      chartWrapper.style.height = "100%";
    }

    let config;
    if (chartMode === "distribution") {
      if (!gradeDistData || gradeDistData.grades.length === 0) {
        chartOuter.innerHTML = '<div class="alert alert-warning">No grade data available to display.</div>';
        return;
      }
      config = buildPieChartConfig(gradeDistData);
    } else if (chartMode === "credits") {
      if (!creditsData || creditsData.semesters.length === 0) {
        chartOuter.innerHTML = '<div class="alert alert-warning">No credit data available to display.</div>';
        return;
      }
      config = buildCreditsBarConfig(creditsData);
    } else if (chartMode === "faculty") {
      if (!facultyData || facultyData.length === 0) {
        chartOuter.innerHTML = '<div class="alert alert-warning">No faculty data available to display.</div>';
        return;
      }
      config = buildFacultyBarConfig(facultyData);
    } else {
      if (!chartData || chartData.semesters.length === 0) {
        chartOuter.innerHTML = '<div class="alert alert-warning">No semester data available to display in the chart.</div>';
        return;
      }
      config = buildChartConfig(chartData);
    }

    chartInstance = new Chart(ctx, config);
    updateSidePanel(chartMode);
  }

  function fmt(n, digits = 2) {
    return Number.isFinite(n) ? n.toFixed(digits) : "—";
  }

  function updateSidePanel(mode) {
    const panel = document.getElementById("chart-side-panel");
    if (!panel) return;

    let html = "";

    if (mode === "both" || mode === "cgpa") {
      const cgpas = (chartData && chartData.cgpaValues) ? chartData.cgpaValues.filter((v) => v > 0) : [];
      const highest = cgpas.length ? fmt(Math.max(...cgpas)) : "—";
      const lowest = cgpas.length ? fmt(Math.min(...cgpas)) : "—";
      const avg = cgpas.length ? fmt(cgpas.reduce((a, b) => a + b, 0) / cgpas.length) : "—";
      html = `
        <h4>CGPA Trends</h4>
        <p>Track how your CGPA has progressed over time.</p>
        <p><small>Hover over each point to see details.</small></p>
        <div style="margin-top: 15px;">
          <p>Highest CGPA: <strong>${highest}</strong></p>
          <p>Lowest CGPA: <strong>${lowest}</strong></p>
          <p>Average CGPA: <strong>${avg}</strong></p>
        </div>
      `;
    } else if (mode === "sgpa") {
      const valid = chartData
        ? chartData.semesterGPAs
            .map((v, i) => ({ v, key: chartData.semesters[i] }))
            .filter((x) => x.v > 0)
        : [];
      let bestKey = "—", worstKey = "—", best = "—", worst = "—", avg = "—";
      if (valid.length) {
        const bestEntry = valid.reduce((a, b) => (b.v > a.v ? b : a));
        const worstEntry = valid.reduce((a, b) => (b.v < a.v ? b : a));
        best = fmt(bestEntry.v); bestKey = bestEntry.key;
        worst = fmt(worstEntry.v); worstKey = worstEntry.key;
        avg = fmt(valid.reduce((s, x) => s + x.v, 0) / valid.length);
      }
      html = `
        <h4>Semester GPA Trends</h4>
        <p>Per-semester GPA highs and lows.</p>
        <p><small>Hover over each point to see details.</small></p>
        <div style="margin-top: 15px;">
          <p>Best: <strong>${best}</strong> ${best !== "—" ? `<small>(${bestKey})</small>` : ""}</p>
          <p>Worst: <strong>${worst}</strong> ${worst !== "—" ? `<small>(${worstKey})</small>` : ""}</p>
          <p>Average: <strong>${avg}</strong></p>
        </div>
      `;
    } else if (mode === "distribution") {
      const counts = (gradeDistData && gradeDistData.data) || [];
      const total = counts.reduce((a, b) => a + b, 0);
      let mostCommon = "—", mostCommonCount = 0;
      if (gradeDistData) {
        gradeDistData.data.forEach((cnt, i) => {
          if (cnt > mostCommonCount) {
            mostCommonCount = cnt;
            mostCommon = gradeDistData.grades[i];
          }
        });
      }
      const distinct = (gradeDistData && gradeDistData.grades.length) || 0;
      html = `
        <h4>Grade Breakdown</h4>
        <p>Your overall grade distribution.</p>
        <p><small>Hover over each slice for details.</small></p>
        <div style="margin-top: 15px;">
          <p>Total courses: <strong>${total}</strong></p>
          <p>Most common: <strong>${mostCommon}</strong>${mostCommonCount > 0 ? ` <small>(${mostCommonCount} course${mostCommonCount !== 1 ? "s" : ""})</small>` : ""}</p>
          <p>Distinct grades: <strong>${distinct}</strong></p>
        </div>
      `;
    } else if (mode === "credits") {
      let totalCr = 0, avgCr = "—", maxCr = "—", minCr = "—", maxKey = "", minKey = "";
      if (creditsData && creditsData.semesters.length) {
        totalCr = creditsData.credits.reduce((a, b) => a + b, 0);
        avgCr = fmt(totalCr / creditsData.semesters.length, 1);
        let maxIdx = 0, minIdx = 0;
        creditsData.credits.forEach((v, i) => {
          if (v > creditsData.credits[maxIdx]) maxIdx = i;
          if (v < creditsData.credits[minIdx]) minIdx = i;
        });
        maxCr = fmt(creditsData.credits[maxIdx], 1);
        maxKey = creditsData.semesters[maxIdx];
        minCr = fmt(creditsData.credits[minIdx], 1);
        minKey = creditsData.semesters[minIdx];
      }
      html = `
        <h4>Credit Summary</h4>
        <p>Credit load across semesters.</p>
        <p><small>Hover over bars for details.</small></p>
        <div style="margin-top: 15px;">
          <p>Total credits: <strong>${fmt(totalCr, 1)}</strong></p>
          <p>Avg per semester: <strong>${avgCr}</strong></p>
          <p>Heaviest: <strong>${maxCr}</strong> ${maxKey ? `<small>(${maxKey})</small>` : ""}</p>
          <p>Lightest: <strong>${minCr}</strong> ${minKey ? `<small>(${minKey})</small>` : ""}</p>
        </div>
      `;
    } else if (mode === "heatmap") {
      const filled = fillSemesterYear(originalCourses);
      const semKeys = new Set();
      let totalCourses = 0, totalCr = 0;
      filled.forEach((c) => {
        if (!c.semester || !c.year) return;
        semKeys.add(`${c.semester} ${c.year}`);
        totalCourses += 1;
        totalCr += c.credits || 0;
      });
      html = `
        <h4>Heatmap Overview</h4>
        <p>Your transcript at a glance, colored by grade.</p>
        <p><small>Hover over a tile for course details.</small></p>
        <div style="margin-top: 15px;">
          <p>Semesters: <strong>${semKeys.size}</strong></p>
          <p>Courses: <strong>${totalCourses}</strong></p>
          <p>Total credits: <strong>${fmt(totalCr, 1)}</strong></p>
        </div>
      `;
    } else if (mode === "faculty") {
      let count = 0, top = "—", topAvg = "—", overall = "—";
      if (facultyData && facultyData.length) {
        count = facultyData.length;
        top = facultyData[0].name;
        topAvg = fmt(facultyData[0].avg);
        overall = fmt(facultyData.reduce((s, f) => s + f.avg, 0) / facultyData.length);
      }
      html = `
        <h4>Faculty Insights</h4>
        <p>Average grade earned per faculty.</p>
        <p><small>Hover over bars for the course list.</small></p>
        <div style="margin-top: 15px;">
          <p>Faculty taken: <strong>${count}</strong></p>
          <p>Top: <strong>${topAvg}</strong> ${top !== "—" ? `<small>(${top})</small>` : ""}</p>
          <p>Avg across faculty: <strong>${overall}</strong></p>
        </div>
      `;
    }

    panel.innerHTML = html;
  }

  function initializeChart() {
    chartData = calculateSemesterCGPA(originalCourses);
    gradeDistData = calculateGradeDistribution(originalCourses);
    creditsData = calculateCreditsPerSemester(originalCourses);
    facultyData = calculateFacultyStats(originalCourses);
    if (
      chartData.semesters.length === 0 &&
      gradeDistData.grades.length === 0 &&
      creditsData.semesters.length === 0 &&
      facultyData.length === 0
    ) {
      const panel = document.getElementById("cgpa-chart-panel");
      if (panel) panel.innerHTML =
        '<div class="alert alert-warning">No data available to display in the chart.</div>';
      return;
    }
    renderCGPAChart();

    // Mode toggle
    const toggle = document.getElementById("chart-mode-toggle");
    if (toggle) {
      toggle.addEventListener("click", (e) => {
        const btn = e.target.closest("button[data-mode]");
        if (!btn) return;
        toggle.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        chartMode = btn.dataset.mode;
        renderCGPAChart();
      });
    }
  }

  function attemptChartInitialization(attemptsLeft = 3) {
    if (document.getElementById("cgpa-chart")) {
      initializeChart();
    } else if (attemptsLeft > 0) {
      setTimeout(() => attemptChartInitialization(attemptsLeft - 1), 500);
    } else {
      console.error("[NSU RDS Buddy] Failed to find chart container.");
    }
  }

  window.addEventListener("load", function () {
    setTimeout(() => attemptChartInitialization(), 1000);
  });
})();
