// Main content script for NSU RDS Buddy
// This file is the entry point for the Chrome extension
// It integrates functionality from modularized code

(() => {
  // Get tables from the document
  const tables = document.querySelectorAll(".hist-grades table");
  const [waiverTable, transferTable, semesterTable] = tables;

  // Parse course data using functions from parser.js
  const waiverCourses = parseWaiverCourses(waiverTable);
  const transferCourses = parseTransferCourses(transferTable);
  let semesterCourses = parseSemesterCourses(semesterTable);

  // Store original courses for resetting
  const originalCourses = JSON.parse(JSON.stringify(semesterCourses));

  // Find target element to insert our UI
  let targetElement = document.querySelector(".hist-grades");

  // Initialize UI
  function initializeUI() {
    // Create container for our app
    const container = createContainer();

    // Create tabs and their content
    const overviewTab = createOverviewTab();
    const whatIfTab = createWhatIfTab();
    const chartsTab = createChartsTab();

    // Set up tabs structure
    const tabs = [
      { id: "overview", label: "Overview", content: overviewTab },
      { id: "whatIf", label: "What-If Analysis", content: whatIfTab },
      { id: "charts", label: "Charts", content: chartsTab },
    ];

    // Render tabs in the container
    container.appendChild(renderTabs(tabs));

    // Initialize event listeners
    initEventListeners(container, semesterCourses, waiverCourses);

    // Add the container to the page
    if (targetElement) {
      console.log(
        "Found grade history container, inserting calculator after it"
      );
      let mainContainer =
        targetElement.closest(".container-fluid") ||
        targetElement.closest(".container") ||
        targetElement.parentElement;

      if (mainContainer) {
        mainContainer.appendChild(container);
      } else {
        console.error(
          "Could not find suitable parent container, appending to body"
        );
        document.body.appendChild(container);
      }
    } else {
      console.log("Grade history container not found, appending to body");
      document.body.appendChild(container);
    }

    // Try to load any saved "what-if" scenarios
    loadSavedScenario();
  }

  // Create Overview tab content
  function createOverviewTab() {
    const container = document.createElement("div");

    // Add stats
    container.appendChild(renderStats(semesterCourses, waiverCourses));

    // Add semester courses table
    const semesterColumns = [
      { key: "semester", label: "Semester", sortKey: "semester" },
      { key: "year", label: "Year", sortKey: "year" },
      { key: "code", label: "Course Code", sortKey: "code" },
      { key: "title", label: "Title", sortKey: "title" },
      { key: "credits", label: "Credits", sortKey: "credits" },
      { key: "grade", label: "Grade", sortKey: "grade" },
      {
        label: "GPA Points",
        render: (course) =>
          course.grade && GPAPoints[course.grade]
            ? GPAPoints[course.grade].toFixed(1)
            : "N/A",
        sortKey: "gpa-points",
      },
    ];

    const semesterTable = renderTable(semesterColumns, semesterCourses, true);

    const semesterSection = document.createElement("div");
    semesterSection.className = "course-section";

    const semesterHeading = document.createElement("h3");
    semesterHeading.textContent = "Semester Courses";
    semesterSection.appendChild(semesterHeading);
    semesterSection.appendChild(semesterTable);

    container.appendChild(semesterSection);

    // Add waiver courses table if there are any
    if (waiverCourses.length > 0) {
      const waiverColumns = [
        { key: "code", label: "Course Code", sortKey: "code" },
        { key: "title", label: "Title", sortKey: "title" },
        { key: "credits", label: "Credits", sortKey: "credits" },
        { key: "grade", label: "Grade", sortKey: "grade" },
      ];

      const waiverTable = renderTable(waiverColumns, waiverCourses, true);

      const waiverSection = document.createElement("div");
      waiverSection.className = "course-section";

      const waiverHeading = document.createElement("h3");
      waiverHeading.textContent = "Waiver Courses";
      waiverSection.appendChild(waiverHeading);
      waiverSection.appendChild(waiverTable);

      container.appendChild(waiverSection);
    }

    // Add transfer courses table if there are any
    if (transferCourses.length > 0) {
      const transferColumns = [
        { key: "code", label: "Course Code", sortKey: "code" },
        { key: "title", label: "Title", sortKey: "title" },
        { key: "credits", label: "Credits", sortKey: "credits" },
      ];

      const transferTable = renderTable(transferColumns, transferCourses, true);

      const transferSection = document.createElement("div");
      transferSection.className = "course-section";

      const transferHeading = document.createElement("h3");
      transferHeading.textContent = "Transfer Courses";
      transferSection.appendChild(transferHeading);
      transferSection.appendChild(transferTable);

      container.appendChild(transferSection);
    }

    return container;
  }

  // Create What-If Analysis tab content
  function createWhatIfTab() {
    const container = document.createElement("div");

    const form = renderWhatIfForm(semesterCourses);
    container.appendChild(form);

    const resultContainer = renderWhatIfResult();
    container.appendChild(resultContainer);

    return container;
  }

  // Create Charts tab content
  function createChartsTab() {
    const container = document.createElement("div");

    if (initializeCharts()) {
      // Add semester trend chart
      const chartContainer1 = document.createElement("div");
      chartContainer1.className = "chart-container";
      const trendChart = createSemesterTrendChart(semesterCourses);
      if (trendChart) {
        chartContainer1.appendChild(trendChart);
        container.appendChild(chartContainer1);
      }

      // Add grade distribution chart
      const chartContainer2 = document.createElement("div");
      chartContainer2.className = "chart-container";
      const gradeChart = createGradeDistributionChart(semesterCourses);
      if (gradeChart) {
        chartContainer2.appendChild(gradeChart);
        container.appendChild(chartContainer2);
      }
    } else {
      const errorMessage = document.createElement("p");
      errorMessage.textContent =
        "Chart.js is required for this feature. Please reload the page or check your connection.";
      container.appendChild(errorMessage);
    }

    return container;
  }

  // Load saved "what-if" scenario
  async function loadSavedScenario() {
    try {
      const whatIfData = await loadData("whatIfData");
      if (whatIfData) {
        // Apply saved grades to semester courses
        whatIfData.forEach((savedCourse, index) => {
          if (semesterCourses[index]) {
            semesterCourses[index].grade = savedCourse.grade;
            semesterCourses[index].credits = savedCourse.credits;
          }
        });

        // Update the UI to reflect the loaded data
        const resultContainer = document.querySelector("#whatIfResult");
        if (resultContainer) {
          resultContainer.appendChild(
            renderStats(semesterCourses, waiverCourses)
          );
        }
      }
    } catch (error) {
      console.error("Error loading saved what-if scenario:", error);
    }
  }

  // Add necessary CSS for the extension
  function addStyles() {
    const styleElement = document.createElement("style");
    styleElement.textContent = `
      .nsu-buddy-container {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        margin: 20px 0;
        padding: 20px;
        border-top: 2px solid #ddd;
      }
      
      .nsu-buddy-tabs {
        margin-bottom: 20px;
      }
      
      .tabs-header {
        display: flex;
        border-bottom: 1px solid #ddd;
      }
      
      .tabs-header button {
        padding: 10px 15px;
        border: none;
        background: none;
        cursor: pointer;
      }
      
      .tabs-header button.active {
        border-bottom: 3px solid #4285f4;
        font-weight: bold;
      }
      
      .tab-panel {
        display: none;
        padding: 20px 0;
      }
      
      .tab-panel.active {
        display: block;
      }
      
      .nsu-buddy-stats {
        display: flex;
        flex-wrap: wrap;
        gap: 20px;
        margin-bottom: 20px;
      }
      
      .stat-item {
        padding: 15px;
        background-color: #f8f9fa;
        border-radius: 8px;
        min-width: 120px;
        text-align: center;
      }
      
      .stat-value {
        font-size: 1.8em;
        font-weight: bold;
        color: #4285f4;
      }
      
      .stat-label {
        font-size: 0.9em;
        color: #555;
      }
      
      .nsu-buddy-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 20px;
      }
      
      .nsu-buddy-table th, .nsu-buddy-table td {
        padding: 8px 12px;
        border: 1px solid #ddd;
      }
      
      .nsu-buddy-table th {
        background-color: #f0f0f0;
        font-weight: bold;
        text-align: left;
      }
      
      .nsu-buddy-table th.sortable {
        cursor: pointer;
      }
      
      .nsu-buddy-table th.sortable:after {
        content: ' ↕';
        font-size: 0.8em;
      }
      
      .nsu-buddy-table th.sortable.asc:after {
        content: ' ↓';
      }
      
      .nsu-buddy-table th.sortable.desc:after {
        content: ' ↑';
      }
      
      .nsu-buddy-table tr:nth-child(even) {
        background-color: #f9f9f9;
      }
      
      .nsu-buddy-table tr:hover {
        background-color: #f0f0f0;
      }
      
      .course-section {
        margin-bottom: 30px;
      }
      
      .what-if-form {
        margin-bottom: 30px;
      }
      
      .what-if-form .form-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
        padding: 8px;
        background-color: #f9f9f9;
        border-radius: 4px;
      }
      
      .what-if-form .form-row:hover {
        background-color: #f0f0f0;
      }
      
      .what-if-form label {
        flex: 1;
      }
      
      .what-if-form .course-title {
        font-size: 0.9em;
        color: #555;
      }
      
      .what-if-form .current-grade {
        font-weight: bold;
      }
      
      .what-if-form .grade-select {
        width: 100px;
        padding: 5px;
      }
      
      .what-if-form .button-group {
        margin-top: 20px;
        display: flex;
        gap: 10px;
      }
      
      .what-if-form button {
        padding: 8px 15px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
      }
      
      .calculate-button {
        background-color: #4285f4;
        color: white;
      }
      
      .reset-button {
        background-color: #f1f1f1;
        color: #333;
      }
      
      .what-if-result {
        margin-top: 20px;
      }
      
      .gpa-difference {
        margin-top: 15px;
        padding: 15px;
        background-color: #f9f9f9;
        border-radius: 8px;
      }
      
      .positive {
        color: green;
      }
      
      .negative {
        color: red;
      }
      
      .chart-container {
        margin-bottom: 30px;
      }
    `;

    document.head.appendChild(styleElement);
  }

  // Add the necessary CSS and initialize the UI
  addStyles();
  initializeUI();
})();
