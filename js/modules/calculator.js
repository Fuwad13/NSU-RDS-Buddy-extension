window.GPAPoints = {
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
  I: 0.0,
  W: 0.0,
};

// Calculate the GPA for a collection of courses
window.calculateGPA = function (courses) {
  let creditTotal = 0;
  let gradeTotal = 0;

  courses.forEach((course) => {
    if (
      course.grade &&
      course.grade !== "W" &&
      course.grade !== "I" &&
      GPAPoints[course.grade] !== undefined
    ) {
      const points = GPAPoints[course.grade];
      gradeTotal += points * course.credits;
      creditTotal += course.credits;
    }
  });

  return creditTotal > 0 ? gradeTotal / creditTotal : 0;
};

// Calculate credits completed
window.calculateCompletedCredits = function (courses) {
  return courses
    .filter((course) => {
      return (
        course.grade &&
        course.grade !== "F" &&
        course.grade !== "W" &&
        course.grade !== "I"
      );
    })
    .reduce((total, course) => total + parseFloat(course.credits || 0), 0);
};

// Calculate credits attempted
window.calculateAttemptedCredits = function (courses) {
  return courses
    .filter((course) => {
      return course.grade && course.grade !== "W" && course.grade !== "I";
    })
    .reduce((total, course) => total + parseFloat(course.credits || 0), 0);
};

// Process "what if" scenarios
window.recalculateWithWhatIf = function (courses, whatIfGrades) {
  const modifiedCourses = JSON.parse(JSON.stringify(courses));

  whatIfGrades.forEach((whatIf) => {
    const course = modifiedCourses.find((c) => c.code === whatIf.courseCode);
    if (course) {
      course.grade = whatIf.grade;
    }
  });

  return modifiedCourses;
};
