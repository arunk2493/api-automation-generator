let currentPage = 1;
const pageSize = 5;
let paginatedData = [];

function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  sidebar.classList.toggle("expanded");
}

function showGenerator() {
  document.getElementById("generatorSection").style.display = "block";
}

function clearInputs() {
  const clearBtn = document.getElementById("clearBtn");
  const generateBtn = document.getElementById("generateBtn");
  const downloadBtn = document.getElementById("downloadBtn");

  toggleButtonSpinner(clearBtn, true);

  setTimeout(() => {
    document.getElementById("method").value = "GET";
    document.getElementById("apiPath").value = "";
    document.getElementById("requestBody").value = "";
    document.getElementById("results").style.display = "none";
    document.getElementById("resultTable").innerHTML = "";
    downloadBtn.style.display = "none"; // hide download button on clear
    generateBtn.disabled = false;
    toggleButtonSpinner(clearBtn, false);
  }, 500);
}

async function generateTestCases() {
  const generateBtn = document.getElementById("generateBtn");
  const spinner = generateBtn.querySelector(".spinner");
  const btnText = generateBtn.querySelector(".btn-text");
  const downloadBtn = document.getElementById("downloadBtn");

  spinner.style.display = "inline-block";
  btnText.textContent = "Generating...";
  generateBtn.disabled = true;

  const method = document.getElementById("method").value.trim();
  const apiPath = document.getElementById("apiPath").value.trim();
  let requestBodyString = document.getElementById("requestBody").value.trim() || "";

  try {
    const response = await fetch("http://localhost:8000/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method, path: apiPath, body: requestBodyString }),
    });

    if (!response.ok) {
      const errText = await response.text();
      showToast("API Error: " + response.status + " " + errText);
      return;
    }

    const data = await response.json();

    const testCasesParsed = parseTestCases(data);
  console.log("Parsed test cases:", testCasesParsed);

  if (!Array.isArray(testCasesParsed) || testCasesParsed.length === 0) {
    throw new Error("Parsed array is empty or invalid.");
  }

  displayResults(testCasesParsed);
  showToast("Test cases generated!");
  document.getElementById('results').style.display = 'block';
  downloadBtn.style.display = "inline-block";

  } catch (error) {
    showToast("Fetch error: " + error.message);
    if (data) showRawJsonModal(JSON.stringify(data, null, 2));
  } finally {
    spinner.style.display = "none";
    btnText.textContent = "Generate";
    generateBtn.disabled = false;
    downloadBtn.disabled = false;
  }
}

function toggleButtonSpinner(button, show) {
  const spinner = button.querySelector(".spinner");
  const textSpan = button.querySelector(".btn-text");
  if (show) {
    spinner.style.display = "inline-block";
    button.disabled = true;
    textSpan.textContent = button.id === "generateBtn" ? "Generating..." : "Clearing...";
  } else {
    spinner.style.display = "none";
    button.disabled = false;
    textSpan.textContent = button.id === "generateBtn" ? "Generate" : "Clear";
  }
}

function displayResults(data) {
  let parsed = [];

  try {
    if (Array.isArray(data)) {
      parsed = data;
    } else if (Array.isArray(data.test_cases)) {
      parsed = data.test_cases;
    } else if (Array.isArray(data.data)) {
      parsed = data.data;
    } else {
      throw new Error("Unexpected format");
    }
  } catch (e) {
    showToast("Invalid response format.");
    return;
  }

  if (!parsed.length) {
    showToast("No test cases found.");
    return;
  }

  paginatedData = parsed.map(flattenTestCase);
  currentPage = 1;
  renderTablePage(currentPage);
  document.getElementById("results").style.display = "block";
}

function flattenTestCase(testCase) {
  const flat = {};
  for (let key in testCase) {
    if (typeof testCase[key] === "object" && testCase[key] !== null) {
      if (key === "request") {
        for (let subKey in testCase[key]) {
          flat[`request_${subKey}`] = testCase[key][subKey];
        }
      } else {
        flat[key] = JSON.stringify(testCase[key]);
      }
    } else {
      flat[key] = testCase[key];
    }
  }
  return flat;
}

function renderTablePage(page) {
  const tableHeader = document.getElementById("tableHeader");
  const tableBody = document.getElementById("tableBody");
  const paginationControls = document.getElementById("paginationControls");

  tableHeader.innerHTML = "";
  tableBody.innerHTML = "";
  paginationControls.innerHTML = "";

  if (!paginatedData.length) {
    tableBody.innerHTML = "<tr><td colspan='100%'>No data found.</td></tr>";
    return;
  }

  const headers = Object.keys(paginatedData[0]);

  headers.forEach(header => {
    const th = document.createElement("th");
    th.textContent = header;
    tableHeader.appendChild(th);
  });

  const start = (page - 1) * pageSize;
  const pageItems = paginatedData.slice(start, start + pageSize);

  pageItems.forEach(item => {
    const tr = document.createElement("tr");
    headers.forEach(header => {
      const td = document.createElement("td");
      td.textContent = item[header];
      tr.appendChild(td);
    });
    tableBody.appendChild(tr);
  });

  // Pagination controls
  const totalPages = Math.ceil(paginatedData.length / pageSize);
  if (totalPages > 1) {
    paginationControls.style.display = "flex";
    paginationControls.style.alignItems = "center";
    paginationControls.style.justifyContent = "center";
    paginationControls.style.gap = "10px";

    const prev = document.createElement("button");
    prev.textContent = "⬅️";
    prev.disabled = page === 1;
    prev.onclick = () => {
      currentPage--;
      renderTablePage(currentPage);
    };

    const next = document.createElement("button");
    next.textContent = "➡️";
    next.disabled = page === totalPages;
    next.onclick = () => {
      currentPage++;
      renderTablePage(currentPage);
    };

    const label = document.createElement("span");
    label.textContent = `Page ${page} of ${totalPages}`;
    label.style.minWidth = "100px";
    label.style.textAlign = "center";

    paginationControls.appendChild(prev);
    paginationControls.appendChild(label);
    paginationControls.appendChild(next);
  } else {
    paginationControls.style.display = "";
    paginationControls.style.alignItems = "";
    paginationControls.style.justifyContent = "";
    paginationControls.style.gap = "";
  }
}

function downloadCSV() {
  if (!paginatedData.length) return showToast("No data to download.");

  const headers = Object.keys(paginatedData[0]);
  const csvRows = [headers.join(",")];

  paginatedData.forEach(row => {
    const values = headers.map(header =>
      `"${(row[header] || "").toString().replace(/"/g, '""')}"`
    );
    csvRows.push(values.join(","));
  });

  const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "test_cases.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function showToast(message, duration = 20000) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, duration);
}

function parseTestCases(data) {
  if (!data.test_cases || !Array.isArray(data.test_cases)) {
    throw new Error("Invalid data format");
  }

  try {
    let lines = data.test_cases;

    // Remove markdown code fences and empty lines
    lines = lines.filter(line => !line.trim().startsWith("```") && line.trim() !== "");

    // Remove lines that are comments or explanations
    lines = lines.filter(line => !line.trim().startsWith("*") && !line.includes("Improvements"));

    // Join into one string
    let jsonString = lines.join("\n");

    // Remove JS-style comments (// ...)
    jsonString = jsonString.replace(/\/\/.*$/gm, "");

    // Remove trailing commas before closing braces/brackets
    jsonString = jsonString.replace(/,\s*([\]}])/g, "$1");

    // Replace "string".repeat(n) with repeated string
    jsonString = jsonString.replace(/"([^"]*)"\.repeat\((\d+)\)/g, (match, str, count) => {
      return `"${str.repeat(Number(count))}"`;
    });

    // Trim to just the JSON array part
    const arrayStart = jsonString.indexOf("[");
    const arrayEnd = jsonString.lastIndexOf("]");

    if (arrayStart === -1 || arrayEnd === -1) {
      throw new Error("Could not locate valid JSON array in response");
    }

    const cleanArrayStr = jsonString.substring(arrayStart, arrayEnd + 1);

    return JSON.parse(cleanArrayStr);
  } catch (err) {
    console.error("JSON parse error:", err);
    showToast(`Failed to parse test cases: ${err.message}`, 10000);
    return [];
  }
}

function showRawJsonModal(jsonStr) {
  document.getElementById("rawJsonContent").textContent = jsonStr;
  document.getElementById("rawJsonModal").style.display = "block";
}

function closeRawJsonModal() {
  document.getElementById("rawJsonModal").style.display = "none";
}