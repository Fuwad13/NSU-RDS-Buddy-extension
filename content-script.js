(() => {
  // 1. Grab the three grade‐history tables in order
  const tables = document.querySelectorAll(".hist-grades table");
  const [waiverTable, transferTable, semesterTable] = tables;

  // 2. Utility to parse a table given a mapper fn
  function parseTable(table, mapRowFn) {
    return Array.from(table.querySelectorAll("tbody tr"))
      .filter((row) => !row.classList.contains("divider-td"))
      .map(mapRowFn);
  }

  // 3. Parse Waiver Courses (cols: code, credits, title, grade)
  const waiverCourses = parseTable(waiverTable, (row) => {
    const [codeTd, creditTd, titleTd, gradeTd] = row.querySelectorAll("td");
    return {
      code: codeTd.textContent.trim(),
      credits: parseFloat(creditTd.textContent),
      title: titleTd.textContent.trim(),
      grade: gradeTd.textContent.trim() || null,
    };
  });

  // 4. Parse Transfer Courses (cols: code, credits, title)
  const transferCourses = parseTable(transferTable, (row) => {
    const [codeTd, creditTd, titleTd] = row.querySelectorAll("td");
    return {
      code: codeTd.textContent.trim(),
      credits: parseFloat(creditTd.textContent),
      title: titleTd.textContent.trim(),
    };
  });

  // 5. Parse Semester Courses (cols: semester, year, code, section, facultyCode, facultyName, credit, title, grade, crCount, crPassed)
  let semesterCourses = parseTable(semesterTable, (row) => {
    const cols = row.querySelectorAll("td");
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

  // 6. Now you have three arrays you can use to calculate CGPA, inject UI, etc.
  // console.log({ waiverCourses, transferCourses, semesterCourses });

  // ——— B.1 Create container at the end of the page ———
  // Find the last element on the page to insert our calculator after it
  // First try to find the grade history tables container
  let targetElement = document.querySelector(".hist-grades");

  // If we found the container, get its parent to append after all original content
  if (targetElement) {
    console.log("Found grade history container, inserting calculator after it");
    // Find the main container that holds all content
    let mainContainer =
      targetElement.closest(".container-fluid") ||
      targetElement.closest(".container") ||
      targetElement.parentElement;

    if (mainContainer) {
      // Create our calculator container
      const calculatorContainer = document.createElement("div");
      calculatorContainer.className = "row";
      calculatorContainer.style.marginTop = "30px";
      calculatorContainer.style.marginBottom = "30px";
      calculatorContainer.style.borderTop = "2px solid #ddd";
      calculatorContainer.style.paddingTop = "20px";

      // Create panel container inside the calculator container
      const panel = document.createElement("div");
      panel.id = "whatif-panel";
      panel.className = "col-md-12";

      // ——— B.2 Build enhanced panel HTML ———
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
              </div>
              <div class="col-md-4">
                <div class="well">
                  <h4>CGPA Calculation</h4>
                  <p>Current CGPA: <span id="current-cgpa" style="font-weight: bold;">—</span></p>
                  <p>What-If CGPA: <span id="whatif-result" style="font-weight: bold; color: #4285f4; font-size: 1.2em;">—</span></p>
                  <hr>
                  <p><small>Make changes to the grades of existing courses or add new courses to see how they affect your CGPA.</small></p>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;

      // Append panel to the calculator container
      calculatorContainer.appendChild(panel);

      // Insert the calculator as the last child of the main container
      // This ensures it appears after all original content
      mainContainer.appendChild(calculatorContainer);
    } else {
      // Fallback - append to body
      console.error(
        "Could not find suitable parent container, appending to body"
      );
      insertAfterOriginalContent();
    }
  } else {
    // Fallback method if we can't find the grade history tables
    console.log(
      "Grade history container not found, using alternative insertion method"
    );
    insertAfterOriginalContent();
  }

  // Fallback function to insert after all content
  function insertAfterOriginalContent() {
    // Create a container for our calculator
    console.log("Inserting calculator at the end of the body");
    const calculatorContainer = document.createElement("div");
    calculatorContainer.className = "row";
    calculatorContainer.style.marginTop = "30px";
    calculatorContainer.style.marginBottom = "30px";
    calculatorContainer.style.borderTop = "2px solid #ddd";
    calculatorContainer.style.paddingTop = "20px";
    calculatorContainer.style.width = "100%";
    calculatorContainer.style.maxWidth = "1200px";
    calculatorContainer.style.margin = "30px auto";

    // Create panel container
    const panel = document.createElement("div");
    panel.id = "whatif-panel";
    panel.className = "col-md-12";

    // Set panel HTML
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

    // Append to the end of the body
    document.body.appendChild(calculatorContainer);

    // NEW CODE: Add CGPA vs Semester chart container
    const chartContainer = document.createElement("div");
    chartContainer.className = "row";
    chartContainer.style.marginTop = "30px";
    chartContainer.style.marginBottom = "30px";
    chartContainer.style.width = "100%";
    chartContainer.style.maxWidth = "1200px";
    chartContainer.style.margin = "30px auto";

    // Create panel container for chart
    const chartPanel = document.createElement("div");
    chartPanel.id = "cgpa-chart-panel";
    chartPanel.className = "col-md-12";

    // Set panel HTML
    chartPanel.innerHTML = `
      <div class="panel panel-primary">
        <div class="panel-heading">
          <h3 class="panel-title">CGPA Progression Chart</h3>
        </div>
        <div class="panel-body">
          <div class="row">
            <div class="col-md-9">
              <canvas id="cgpa-chart" style="width: 100%; height: 300px;"></canvas>
            </div>
            <div class="col-md-3">
              <div class="well">
                <h4>CGPA Trends</h4>
                <p>This chart shows how your CGPA has progressed over different semesters.</p>
                <p><small>Hover over each point to see details.</small></p>
                <div id="chart-stats" style="margin-top: 15px;">
                  <p>Highest CGPA: <span id="highest-cgpa" style="font-weight: bold;">—</span></p>
                  <p>Lowest CGPA: <span id="lowest-cgpa" style="font-weight: bold;">—</span></p>
                  <p>Average CGPA: <span id="average-cgpa" style="font-weight: bold;">—</span></p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    chartContainer.appendChild(chartPanel);

    // Get the parent element of calculatorContainer to append the chartContainer after the calculator
    if (calculatorContainer.parentElement) {
      calculatorContainer.parentElement.insertBefore(
        chartContainer,
        calculatorContainer.nextSibling
      );
    } else {
      document.body.appendChild(chartContainer);
    }
  }

  // ——— C.1 Grade‑to‑point mapping ———
  const gradeMap = {
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
  };

  // Store the original courses for current CGPA calculation
  // Create a deep copy to ensure originalCourses never changes
  const originalCourses = JSON.parse(JSON.stringify(semesterCourses));

  // ——— C.2 CGPA calculation fns ———
  function calcCurrentCgpa() {
    // Always use the original courses for current CGPA
    const validCourses = originalCourses.filter(
      (c) => c.grade && gradeMap[c.grade] !== undefined
    );
    const totalPoints = validCourses.reduce(
      (sum, c) => sum + (gradeMap[c.grade] || 0) * c.credits,
      0
    );
    const totalCredits = validCourses.reduce((sum, c) => sum + c.credits, 0);
    return totalCredits ? (totalPoints / totalCredits).toFixed(2) : "—";
  }

  // Cache the calculated current CGPA so it's consistent throughout the session
  const currentCGPAValue = calcCurrentCgpa();

  function calcWhatIfCgpa(courses) {
    const totalPoints = courses.reduce(
      (sum, c) => sum + (gradeMap[c.grade] || 0) * c.credits,
      0
    );
    const totalCredits = courses.reduce((sum, c) => sum + c.credits, 0);
    return totalCredits ? (totalPoints / totalCredits).toFixed(2) : "—";
  }

  // ——— C.3 Render inputs & attach listeners ———
  function renderInputs(courses) {
    const container = document.getElementById("course-inputs-container");
    container.innerHTML = ""; // clear

    // Create table
    const table = document.createElement("table");
    table.className = "table table-striped table-hover";
    table.innerHTML = `
      <thead>
        <tr>
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
    courses.forEach((c, i) => {
      const row = document.createElement("tr");

      // Check if this is an original course or a newly added one
      const isOriginalCourse = originalCourses.some((oc) => oc.code === c.code);

      // Check if the grade has been changed from original
      const originalCourse = originalCourses.find((oc) => oc.code === c.code);
      const isGradeChanged = originalCourse && originalCourse.grade !== c.grade;

      // Apply highlight styling if grade changed
      if (isGradeChanged) {
        console.log("Test debug");
        row.style.backgroundColor = "#fff3cd"; // Light yellow background
        row.style.borderLeft = "3px solid #ffc107"; // Yellow border
      }

      row.innerHTML = `
        <td>${c.code || "New Course"}</td>
        <td>${c.title || "New Course Title"}</td>
        <td>
          <input type="number" data-idx="${i}" class="credit-input form-control" 
                 value="${
                   c.credits || 0
                 }" min="0" max="5" step="0.5" style="width: 70px"
                 ${isOriginalCourse ? "disabled" : ""}>
        </td>
        <td>
          <select data-idx="${i}" data-code="${
        c.code
      }" class="grade-select form-control" 
                  style="width: 70px; ${
                    isGradeChanged
                      ? "background-color: #fff3cd; font-weight: bold;"
                      : ""
                  }">
            <option value="">—</option>
            ${Object.keys(gradeMap)
              .map(
                (g) =>
                  `<option ${c.grade === g ? "selected" : ""}>${g}</option>`
              )
              .join("")}
          </select>
        </td>
        <td>
          <div class="btn-group btn-group-sm">
            <button class="remove-course btn btn-danger btn-sm" data-idx="${i}" title="Remove course">
              <span class="glyphicon glyphicon-trash"></span>
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(row);
    });

    // Display current CGPA using the cached value
    document.getElementById("current-cgpa").innerText = currentCGPAValue;
  }

  // initial render
  renderInputs(semesterCourses);

  // Set the initial what-if CGPA to be the same as current CGPA
  document.getElementById("whatif-result").innerText = currentCGPAValue;

  // event delegation
  document.getElementById("whatif-panel").addEventListener("change", (e) => {
    if (
      e.target.classList.contains("grade-select") ||
      e.target.classList.contains("credit-input")
    ) {
      update();
    }
  });

  // Add event listener for remove course buttons and reset course buttons
  document.getElementById("whatif-panel").addEventListener("click", (e) => {
    // For remove course buttons
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
  });

  // Reset button functionality
  document.getElementById("reset-grades").addEventListener("click", () => {
    // Reset semesterCourses to the original state
    console.log("Resetting to original courses");
    console.log(originalCourses);
    semesterCourses = JSON.parse(JSON.stringify(originalCourses));
    renderInputs(semesterCourses);
    // Use the cached CGPA value for consistency
    document.getElementById("whatif-result").innerText = currentCGPAValue;
    document.getElementById("whatif-result").style.color = "#4285f4";
    // Remove any delta indicators
    const resultElement = document.getElementById("whatif-result");
    resultElement.innerHTML = currentCGPAValue;
  });

  document.getElementById("add-course").addEventListener("click", () => {
    document.getElementById("add-course-modal").style.display = "flex";
  });

  // load saved scenario on init
  chrome.storage.local.get("whatIfData", ({ whatIfData }) => {
    if (whatIfData) {
      // merge saved grades back into semesterCourses
      whatIfData.forEach((c, i) => {
        if (semesterCourses[i]) {
          semesterCourses[i].grade = c.grade;
          semesterCourses[i].credits = c.credits;
        }
      });
      renderInputs(semesterCourses);
      update();
    }
  });

  // Add course modal HTML to the page
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

    // Add event listeners for the modal
    document
      .getElementById("cancel-add-course")
      .addEventListener("click", () => {
        document.getElementById("add-course-modal").style.display = "none";
      });

    document
      .getElementById("add-course-form")
      .addEventListener("submit", (e) => {
        e.preventDefault();

        const codeInput = document.getElementById("new-course-code");
        const titleInput = document.getElementById("new-course-title");
        const creditsInput = document.getElementById("new-course-credits");
        const gradeInput = document.getElementById("new-course-grade");

        // Validate inputs
        if (
          !codeInput.value ||
          !titleInput.value ||
          !creditsInput.value ||
          !gradeInput.value
        ) {
          document.getElementById("course-validation-error").style.display =
            "block";
          return;
        }

        // Add the new course
        semesterCourses.push({
          code: codeInput.value,
          title: titleInput.value,
          credits: parseFloat(creditsInput.value),
          grade: gradeInput.value,
        });

        // Hide modal and update view
        document.getElementById("add-course-modal").style.display = "none";
        renderInputs(semesterCourses);
        update();

        // Reset form for next use
        codeInput.value = "";
        titleInput.value = "";
        creditsInput.value = "3";
        gradeInput.value = "";
        document.getElementById("course-validation-error").style.display =
          "none";
      });
  }

  // Create the modal on page load
  createAddCourseModal();

  // ——— C.4 Handle updates & storage ———
  function update() {
    // gather form state
    const selects = Array.from(
      document.querySelectorAll("#course-inputs .grade-select")
    );
    const credits = Array.from(
      document.querySelectorAll("#course-inputs .credit-input")
    );

    // Update the semesterCourses array with current values from the form
    selects.forEach((select, i) => {
      const idx = parseInt(select.dataset.idx);
      const courseCode = select.dataset.code;
      if (idx >= 0 && idx < semesterCourses.length) {
        // Update the grade in the semesterCourses array
        semesterCourses[idx].grade = select.value;

        // Check if this is an original course with changed grade
        const originalCourse = originalCourses.find(
          (oc) => oc.code === courseCode
        );
        const isOriginalCourse = !!originalCourse;
        const isGradeChanged =
          isOriginalCourse && originalCourse.grade !== select.value;

        // Get the row containing this select
        const row = select.closest("tr");

        // Apply or remove highlighting based on whether grade has changed
        if (isGradeChanged) {
          row.style.backgroundColor = "#fff3cd";
          row.style.borderLeft = "3px solid #ffc107";
          select.style.backgroundColor = "#fff3cd";
          select.style.fontWeight = "bold";
        } else if (isOriginalCourse) {
          // Remove highlighting if grade is same as original
          row.style.backgroundColor = "";
          row.style.borderLeft = "";
          select.style.backgroundColor = "";
          select.style.fontWeight = "";
        }
      }
    });

    // Update credit values for new courses (original courses have disabled inputs)
    credits.forEach((input, i) => {
      if (!input.disabled) {
        const idx = parseInt(input.dataset.idx);
        if (idx >= 0 && idx < semesterCourses.length) {
          semesterCourses[idx].credits = parseFloat(input.value) || 0;
        }
      }
    });

    // Get current values for CGPA calculation
    const current = semesterCourses.map((c) => ({
      credits: c.credits || 0,
      grade: c.grade,
      code: c.code,
      title: c.title,
    }));

    // compute & display
    const currentCGPA = parseFloat(currentCGPAValue);
    const whatIfCGPA = parseFloat(calcWhatIfCgpa(current));
    const resultElement = document.getElementById("whatif-result");

    // Color coding based on improvement or decline with delta badge
    if (whatIfCGPA > currentCGPA) {
      // Green for improvement
      const delta = (whatIfCGPA - currentCGPA).toFixed(2);
      resultElement.style.color = "#28a745";
      resultElement.innerHTML = `${whatIfCGPA.toFixed(
        2
      )} <span class="badge" style="background-color: #28a745; margin-left: 5px;">+${delta}</span>`;
    } else if (whatIfCGPA < currentCGPA) {
      // Red for decline
      const delta = (whatIfCGPA - currentCGPA).toFixed(2);
      resultElement.style.color = "#dc3545";
      resultElement.innerHTML = `${whatIfCGPA.toFixed(
        2
      )} <span class="badge" style="background-color: #dc3545; margin-left: 5px;">${delta}</span>`;
    } else {
      // Original blue for no change
      resultElement.style.color = "#4285f4";
      resultElement.innerHTML = whatIfCGPA.toFixed(2);
    }

    console.log(
      "Updated CGPA calculation: Current=" +
        currentCGPA +
        ", What-If=" +
        whatIfCGPA
    );
  }

  // ——— D.1 Semester vs CGPA Chart ———
  function initializeChart() {
    // Make sure the chart container exists before proceeding
    const chartCanvas = document.getElementById("cgpa-chart");
    if (!chartCanvas) {
      console.error("Chart canvas element not found during initialization");
      // Try to create the container if it doesn't exist yet
      createChartContainerIfNeeded();
      return;
    }

    // Calculate CGPA per semester for the chart
    const semesterData = calculateSemesterCGPA(originalCourses);

    if (semesterData.semesters.length === 0) {
      console.log("No valid semester data available for chart");
      document.getElementById("cgpa-chart-panel").innerHTML =
        '<div class="alert alert-warning">No semester data available to display in the chart.</div>';
      return;
    }

    // Render the chart
    renderCGPAChart(semesterData);

    // Update statistics
    updateChartStatistics(semesterData.cgpaValues);
  }

  // Create chart container if it doesn't exist yet
  function createChartContainerIfNeeded() {
    // Check if the chart container already exists
    if (document.getElementById("cgpa-chart")) {
      return; // Chart container already exists
    }

    console.log("Creating chart container");
    const calculatorContainer = document
      .querySelector("#whatif-panel")
      .closest(".row");

    if (!calculatorContainer) {
      console.error("Could not find calculator container to position chart");
      return;
    }

    // Create the chart container
    const chartContainer = document.createElement("div");
    chartContainer.className = "row";
    chartContainer.style.marginTop = "30px";
    chartContainer.style.marginBottom = "30px";
    chartContainer.style.width = "100%";
    chartContainer.style.maxWidth = "1200px";
    chartContainer.style.margin = "30px auto";

    // Create panel container for chart
    const chartPanel = document.createElement("div");
    chartPanel.id = "cgpa-chart-panel";
    chartPanel.className = "col-md-12";

    // Set panel HTML
    chartPanel.innerHTML = `
      <div class="panel panel-primary">
        <div class="panel-heading">
          <h3 class="panel-title">CGPA Progression Chart</h3>
        </div>
        <div class="panel-body">
          <div class="row">
            <div class="col-md-9">
              <canvas id="cgpa-chart" style="width: 100%; height: 300px;"></canvas>
            </div>
            <div class="col-md-3">
              <div class="well">
                <h4>CGPA Trends</h4>
                <p>This chart shows how your CGPA has progressed over different semesters.</p>
                <p><small>Hover over each point to see details.</small></p>
                <div id="chart-stats" style="margin-top: 15px;">
                  <p>Highest CGPA: <span id="highest-cgpa" style="font-weight: bold;">—</span></p>
                  <p>Lowest CGPA: <span id="lowest-cgpa" style="font-weight: bold;">—</span></p>
                  <p>Average CGPA: <span id="average-cgpa" style="font-weight: bold;">—</span></p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    chartContainer.appendChild(chartPanel);

    // Insert the chart container after the calculator container
    const parentElement = calculatorContainer.parentElement;
    if (parentElement) {
      parentElement.insertBefore(
        chartContainer,
        calculatorContainer.nextSibling
      );
    } else {
      document.body.appendChild(chartContainer);
    }
  }

  function calculateSemesterCGPA(courses) {
    // Create a deep copy of the original courses to ensure we don't modify them
    const coursesCopy = JSON.parse(JSON.stringify(courses));
    // Fill up null values in the array
    coursesCopy.forEach((course, index) => {
      if (index > 0) {
        const prevCourse = coursesCopy[index - 1];
        if (!course.semester) course.semester = prevCourse.semester;
        if (!course.year) course.year = prevCourse.year;
      }
    });
    console.log(coursesCopy);

    // Group courses by semester and year while preserving original order
    const semesterGroups = {};
    const semesterOrder = [];

    coursesCopy.forEach((course) => {
      if (!course.grade || !gradeMap[course.grade]) {
        return; // Skip courses with no grade or invalid grade
      }

      const key =
        course.semester && course.year
          ? `${course.semester} ${course.year}`
          : "Unknown";

      if (!semesterGroups[key]) {
        semesterGroups[key] = [];
        // Add to order list only once when we first see this semester
        semesterOrder.push(key);
      }

      semesterGroups[key].push(course);
    });

    // Arrays for chart data
    const semesters = [];
    const cgpaValues = [];
    const totalCredits = [];
    const courseCounts = [];
    const semesterCredits = [];
    const semesterGPAs = []; // New array to store individual semester GPAs

    // Track cumulative data for CGPA calculation
    let cumulativeCourses = [];
    let cumulativePoints = 0;
    let cumulativeCredits = 0;

    // Process semesters in the order they appear in the transcript
    semesterOrder.forEach((semesterKey) => {
      const semesterCourses = semesterGroups[semesterKey];

      // Calculate per-semester statistics
      let semesterTotalCredits = 0;
      let semesterTotalPoints = 0;

      semesterCourses.forEach((course) => {
        if (course.grade && gradeMap[course.grade] !== undefined) {
          const coursePoints = gradeMap[course.grade] * course.credits;

          // Add to semester totals
          semesterTotalPoints += coursePoints;
          semesterTotalCredits += course.credits;

          // Add to cumulative totals
          cumulativePoints += coursePoints;
          cumulativeCredits += course.credits;
        }
      });

      // Calculate semester GPA and cumulative GPA
      const semesterGPA =
        semesterTotalCredits > 0
          ? semesterTotalPoints / semesterTotalCredits
          : 0;

      const cgpa =
        cumulativeCredits > 0 ? cumulativePoints / cumulativeCredits : 0;

      // Add all data points for this semester
      semesters.push(semesterKey);
      cgpaValues.push(parseFloat(cgpa.toFixed(2)));
      totalCredits.push(cumulativeCredits);
      semesterCredits.push(semesterTotalCredits);
      courseCounts.push(semesterCourses.length);
      semesterGPAs.push(parseFloat(semesterGPA.toFixed(2))); // Add the semester GPA

      // Add this semester's courses to our running list
      cumulativeCourses = [...cumulativeCourses, ...semesterCourses];
    });

    return {
      semesters,
      cgpaValues,
      totalCredits,
      courseCounts,
      semesterCredits,
      semesterGPAs, // Return the semester GPAs array
    };
  }

  function renderCGPAChart(data) {
    const ctx = document.getElementById("cgpa-chart");

    if (!ctx) {
      console.error("Chart canvas element not found");
      return;
    }

    // Check if Chart.js is available
    if (typeof Chart === "undefined") {
      console.error("Chart.js library not loaded");
      document.getElementById("cgpa-chart-panel").innerHTML =
        '<div class="alert alert-danger">Chart.js library not available. Please refresh the page.</div>';
      return;
    }

    try {
      // Create the chart
      const cgpaChart = new Chart(ctx, {
        type: "line",
        data: {
          labels: data.semesters,
          datasets: [
            {
              label: "CGPA",
              data: data.cgpaValues,
              backgroundColor: "rgba(54, 162, 235, 0.2)",
              borderColor: "rgba(54, 162, 235, 1)",
              borderWidth: 2,
              pointBackgroundColor: "rgba(54, 162, 235, 1)",
              pointRadius: 5,
              tension: 0.1,
              fill: true, // Fill area under the curve
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: false,
              min: 0,
              max: 4.0, // Extended slightly above 4.0 for better visibility
              suggestedMax: 4.0, // Ensure we see above 4.0
              ticks: {
                callback: function (value, index, values) {
                  // Only show tick labels up to 4.0
                  return value <= 4.0 ? value.toFixed(1) : "";
                },
                stepSize: 0.5,
              },
              title: {
                display: true,
                text: "CGPA",
              },
              grid: {
                color: function (context) {
                  // Make the grid line at y=4 black and thicker
                  if (context.tick && context.tick.value === 4) {
                    return "rgba(0, 0, 0, 0.8)";
                  }
                  // Regular grid lines
                  return "rgba(0, 0, 0, 0.1)";
                },
                lineWidth: function (context) {
                  // Make the grid line at y=4 thicker
                  if (context.tick && context.tick.value === 4) {
                    return 1.5;
                  }
                  // Regular grid line width
                  return 1;
                },
              },
            },
            x: {
              title: {
                display: true,
                text: "Semester",
              },
            },
          },
          plugins: {
            tooltip: {
              callbacks: {
                title: function (context) {
                  const index = context[0].dataIndex;
                  return data.semesters[index] || "Unknown Semester";
                },
                afterTitle: function (context) {
                  const index = context[0].dataIndex;
                  return `Semester GPA: ${data.semesterGPAs[index]}, Courses: ${data.courseCounts[index]}, Semester Credits: ${data.semesterCredits[index]}, Total Credits: ${data.totalCredits[index]}`;
                },
                label: function (context) {
                  let label = context.dataset.label || "";
                  if (label) {
                    label += ": ";
                  }
                  if (context.parsed.y !== null) {
                    label += context.parsed.y.toFixed(2);
                  }
                  return label;
                },
              },
            },
            legend: {
              position: "top",
            },
            title: {
              display: true,
              text: "CGPA Progression by Semester",
            },
          },
        },
      });
    } catch (error) {
      console.error("Error creating chart:", error);
      if (document.getElementById("cgpa-chart-panel")) {
        document.getElementById("cgpa-chart-panel").innerHTML =
          '<div class="alert alert-danger">Failed to create chart. Error: ' +
          error.message +
          "</div>";
      }
    }
  }

  function updateChartStatistics(cgpaValues) {
    if (cgpaValues.length === 0) return;

    const statsElements = {
      highest: document.getElementById("highest-cgpa"),
      lowest: document.getElementById("lowest-cgpa"),
      average: document.getElementById("average-cgpa"),
    };

    // Check if elements exist
    if (
      !statsElements.highest ||
      !statsElements.lowest ||
      !statsElements.average
    ) {
      console.error("Stats elements not found");
      return;
    }

    // Calculate statistics
    const highest = Math.max(...cgpaValues).toFixed(2);
    const lowest = Math.min(...cgpaValues).toFixed(2);
    const average = (
      cgpaValues.reduce((a, b) => a + b, 0) / cgpaValues.length
    ).toFixed(2);

    // Update the DOM
    statsElements.highest.textContent = highest;
    statsElements.lowest.textContent = lowest;
    statsElements.average.textContent = average;
  }

  // Initialize the chart after the page has fully loaded
  // Use a more reliable approach with multiple attempts if needed
  function attemptChartInitialization(attemptsLeft = 3) {
    if (document.getElementById("cgpa-chart")) {
      console.log("Chart container found, initializing chart");
      initializeChart();
    } else if (attemptsLeft > 0) {
      console.log(
        `Chart container not found yet, ${attemptsLeft} attempts left`
      );
      createChartContainerIfNeeded();
      setTimeout(() => attemptChartInitialization(attemptsLeft - 1), 500);
    } else {
      console.error(
        "Failed to find or create chart container after multiple attempts"
      );
    }
  }

  // Start the chart initialization process when page is fully loaded
  window.addEventListener("load", function () {
    console.log("Window loaded, starting chart initialization");
    // Try to create the chart container first
    createChartContainerIfNeeded();
    // Then attempt to initialize the chart with a delay and retry mechanism
    setTimeout(() => attemptChartInitialization(), 1000);
  });
})();
