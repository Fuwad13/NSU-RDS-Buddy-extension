// Chart module for NSU RDS Buddy
// Responsible for chart-related functionality

// Initialize Chart.js if available
window.initializeCharts = function () {
  if (!window.Chart) {
    console.warn("Chart.js is not available");
    return false;
  }
  return true;
};

// Create a semester GPA trend chart
window.createSemesterTrendChart = function (semesterData) {
  if (!window.Chart) return null;

  const canvas = document.createElement("canvas");
  canvas.id = "semesterTrendChart";
  canvas.style.width = "100%";
  canvas.style.height = "300px";

  // Group courses by semester and calculate GPA for each
  const semesterGpas = calculateSemesterGpas(semesterData);

  // Sort semesters chronologically
  const sortedSemesters = Object.keys(semesterGpas).sort((a, b) => {
    const [aYear, aSem] = a.split(" ");
    const [bYear, bSem] = b.split(" ");

    if (aYear !== bYear) {
      return parseInt(aYear) - parseInt(bYear);
    }

    const semOrder = { Spring: 1, Summer: 2, Fall: 3 };
    return semOrder[aSem] - semOrder[bSem];
  });

  // Extract data for chart
  const labels = sortedSemesters;
  const gpas = labels.map((semester) => semesterGpas[semester]);

  // Create chart
  new Chart(canvas, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Semester GPA",
          data: gpas,
          borderColor: "rgba(75, 192, 192, 1)",
          backgroundColor: "rgba(75, 192, 192, 0.2)",
          tension: 0.1,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: false,
          min: Math.max(0, Math.min(...gpas) - 0.5),
          max: 4.0,
        },
      },
      plugins: {
        title: {
          display: true,
          text: "Semester GPA Trend",
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              return `GPA: ${context.parsed.y.toFixed(2)}`;
            },
          },
        },
      },
    },
  });

  return canvas;
};

// Create a grade distribution chart
window.createGradeDistributionChart = function (courses) {
  if (!window.Chart) return null;

  const canvas = document.createElement("canvas");
  canvas.id = "gradeDistributionChart";
  canvas.style.width = "100%";
  canvas.style.height = "300px";

  // Count occurrences of each grade
  const gradeDistribution = calculateGradeDistribution(courses);

  // Order of grades
  const gradeOrder = [
    "A",
    "A-",
    "B+",
    "B",
    "B-",
    "C+",
    "C",
    "C-",
    "D+",
    "D",
    "F",
    "W",
    "I",
  ];

  // Filter to only include grades that have at least one occurrence
  const labels = gradeOrder.filter((grade) => gradeDistribution[grade] > 0);
  const counts = labels.map((grade) => gradeDistribution[grade]);

  // Color map
  const colorMap = {
    A: "rgba(75, 192, 75, 0.8)",
    "A-": "rgba(115, 192, 75, 0.8)",
    "B+": "rgba(155, 192, 75, 0.8)",
    B: "rgba(192, 192, 75, 0.8)",
    "B-": "rgba(192, 155, 75, 0.8)",
    "C+": "rgba(192, 115, 75, 0.8)",
    C: "rgba(192, 75, 75, 0.8)",
    "C-": "rgba(192, 75, 115, 0.8)",
    "D+": "rgba(192, 75, 155, 0.8)",
    D: "rgba(192, 75, 192, 0.8)",
    F: "rgba(192, 75, 75, 0.8)",
    W: "rgba(100, 100, 100, 0.8)",
    I: "rgba(150, 150, 150, 0.8)",
  };

  const colors = labels.map(
    (grade) => colorMap[grade] || "rgba(100, 100, 100, 0.8)"
  );

  // Create chart
  new Chart(canvas, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Grade Count",
          data: counts,
          backgroundColor: colors,
          borderColor: colors.map((color) => color.replace("0.8", "1")),
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
          },
        },
      },
      plugins: {
        title: {
          display: true,
          text: "Grade Distribution",
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              return `${context.parsed.y} course(s)`;
            },
          },
        },
      },
    },
  });

  return canvas;
};

// Helper function to calculate GPA for each semester
function calculateSemesterGpas(courses) {
  const semesterCourses = {};

  // Group courses by semester
  courses.forEach((course) => {
    if (
      course.semester &&
      course.year &&
      course.grade &&
      course.grade !== "W" &&
      course.grade !== "I"
    ) {
      const semesterKey = `${course.year} ${course.semester}`;

      if (!semesterCourses[semesterKey]) {
        semesterCourses[semesterKey] = [];
      }

      semesterCourses[semesterKey].push(course);
    }
  });

  // Calculate GPA for each semester
  const semesterGpas = {};

  Object.keys(semesterCourses).forEach((semester) => {
    const courses = semesterCourses[semester];

    let totalPoints = 0;
    let totalCredits = 0;

    courses.forEach((course) => {
      if (course.grade && course.grade !== "W" && course.grade !== "I") {
        const gradePoints = getGradePoints(course.grade);
        totalPoints += gradePoints * course.credits;
        totalCredits += course.credits;
      }
    });

    semesterGpas[semester] = totalCredits > 0 ? totalPoints / totalCredits : 0;
  });

  return semesterGpas;
}

// Helper function to calculate grade distribution
function calculateGradeDistribution(courses) {
  const distribution = {
    A: 0,
    "A-": 0,
    "B+": 0,
    B: 0,
    "B-": 0,
    "C+": 0,
    C: 0,
    "C-": 0,
    "D+": 0,
    D: 0,
    F: 0,
    W: 0,
    I: 0,
  };

  courses.forEach((course) => {
    if (course.grade && distribution[course.grade] !== undefined) {
      distribution[course.grade]++;
    }
  });

  return distribution;
}

// Helper function to get grade points
function getGradePoints(grade) {
  const gradePoints = {
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
    W: 0.0,
    I: 0.0,
  };

  return gradePoints[grade] || 0;
}
