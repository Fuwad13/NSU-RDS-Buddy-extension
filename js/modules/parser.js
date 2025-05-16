// Parser module for NSU RDS Buddy
// Responsible for parsing HTML tables and extracting course data

// Make functions available globally for Chrome extension
window.parseTable = function (table, mapRowFn) {
  return Array.from(table.querySelectorAll("tbody tr"))
    .filter((row) => !row.classList.contains("divider-td"))
    .map(mapRowFn);
};

window.parseWaiverCourses = function (waiverTable) {
  return parseTable(waiverTable, (row) => {
    const [codeTd, creditTd, titleTd, gradeTd] = row.querySelectorAll("td");
    return {
      code: codeTd.textContent.trim(),
      credits: parseFloat(creditTd.textContent),
      title: titleTd.textContent.trim(),
      grade: gradeTd.textContent.trim() || null,
    };
  });
};

window.parseTransferCourses = function (transferTable) {
  return parseTable(transferTable, (row) => {
    const [codeTd, creditTd, titleTd] = row.querySelectorAll("td");
    return {
      code: codeTd.textContent.trim(),
      credits: parseFloat(creditTd.textContent),
      title: titleTd.textContent.trim(),
    };
  });
};

window.parseSemesterCourses = function (semesterTable) {
  return parseTable(semesterTable, (row) => {
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
};
