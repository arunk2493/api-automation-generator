let currentPage = 1;
const pageSize = 5;
let paginatedData = [];
let testCases = [];
let currentTestCases = [];
let testCasesParsed = [];


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
        document.getElementById("requestBody").value = "";
        document.getElementById("toggleCodeType").checked = false;
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
    const generateCodeBtn = document.getElementById("generateCodeBtn");
    const codeLayout = document.getElementById("codeLayout");

    spinner.style.display = "inline-block";
    btnText.textContent = "Generating...";
    generateBtn.disabled = true;
    generateCodeBtn.disabled = true;

    const method = document.getElementById("method").value.trim();
    const apiPath = document.getElementById("apiPath").value.trim();
    const requestBodyString = document.getElementById("requestBody").value.trim() || "";

    try {
        const response = await fetch("http://localhost:8000/generate-test-cases", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                method,
                path: apiPath,
                body: requestBodyString,
                sample_response: ""
            }),
        });

        if (!response.ok) {
            const errText = await response.text();
            showToast("API Error: " + response.status + " " + errText);
            return;
        }

        const data = await response.json();
        const testCasesParsed = parseTestCases(data);

        if (!Array.isArray(testCasesParsed) || testCasesParsed.length === 0) {
            throw new Error("Parsed array is empty or invalid.");
        }

        currentTestCases = testCasesParsed;
        displayResults(testCasesParsed);
        showToast("Test cases generated!");
        document.getElementById('results').style.display = 'block';

        downloadBtn.style.display = "inline-block";
        generateCodeBtn.style.display = "inline-block";
        codeLayout.style.display = "none";

    } catch (error) {
        showToast("Fetch error: " + error.message);
        if (typeof data !== "undefined") {
            showRawJsonModal(JSON.stringify(data, null, 2));
        }
    } finally {
        spinner.style.display = "none";
        btnText.textContent = "Generate";
        generateBtn.disabled = false;
        downloadBtn.disabled = false;
        generateCodeBtn.disabled = false;
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

    const blob = new Blob([csvRows.join("\n")], {
        type: "text/csv"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "test_cases.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function showToast(message, duration = 5000) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, duration);
}

function parseTestCases(data) {
    if (!data.test_cases || !Array.isArray(data.test_cases)) {
        throw new Error("Invalid data format: test_cases must be an array");
    }
    return data.test_cases;
}



function showRawJsonModal(jsonStr) {
    document.getElementById("rawJsonContent").textContent = jsonStr;
    document.getElementById("rawJsonModal").style.display = "block";
}

function closeRawJsonModal() {
    document.getElementById("rawJsonModal").style.display = "none";
}

async function generateCode() {
    const generateCodeBtn = document.getElementById('generateCodeBtn');
    const isKarateUnchecked = document.getElementById('toggleCodeType');
    generateCodeBtn.disabled = true;
    generateCodeBtn.textContent = 'Generating...';
    isKarateUnchecked.checked = false;

    try {
        const response = await fetch('http://localhost:8000/generate-code/java', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                testCases: currentTestCases
            })
        });

        if (!response.ok) {
            throw new Error(`Error: ${response.statusText}`);
        }

        const data = await response.json();
        console.log(data);
        console.log(data.generatedCode);

        if (data.generatedCode) {
            // Show and fill the java code block
            const javaCodeBlock = document.getElementById('javaCodeBlock');
            console.log("Inside Block:"+ data.generatedCode);
            javaCodeBlock.textContent = data.generatedCode;

            // Show the java code output container
            document.getElementById('javaCodeOutput').style.display = 'block';

            // Show the whole code layout container
            document.getElementById('codeLayout').style.display = 'block';

            // Scroll to top of the code block container (the <pre> element's parent)
            javaCodeBlock.parentElement.scrollTop = 0;

            showToast("Code Generated Successfully");
        } else {
            showToast("No Java code generated.");
        }

        // Optional: update textarea with combined java_code array if present
        if (data.java_code && Array.isArray(data.java_code)) {
            const javaCodeCombined = data.java_code.join('\n\n// -----------------------------\n\n');
            const codeArea = document.getElementById('codeArea');
            if (codeArea) {
                codeArea.value = javaCodeCombined;
            }
        }

    } catch (err) {
        showToast(`Failed to generate code: ${err.message}`);
    } finally {
        generateCodeBtn.disabled = false;
        generateCodeBtn.textContent = 'Generate Code';
    }
}

// Toggle code type (Java / Karate)
async function toggleCodeType() {
    const isKarateChecked = document.getElementById('toggleCodeType').checked;
    const javaCodeBlock = document.getElementById('javaCodeBlock');
    const generateCodeBtn = document.getElementById('generateCodeBtn');
    const spinner = document.getElementById('spinner');

    // Show spinner and disable button during toggle
    spinner.style.display = 'inline-block';
    generateCodeBtn.disabled = true;
    generateCodeBtn.textContent = 'Switching...';

    try {
        // Deep clone currentTestCases to avoid mutating original
        const testCasesPayload = JSON.parse(JSON.stringify(currentTestCases));

        // Stringify request bodies if they are objects
        testCasesPayload.forEach(tc => {
            if (tc.request && typeof tc.request.body === 'object') {
                tc.request.body = JSON.stringify(tc.request.body);
            }
        });

        const endpoint = isKarateChecked 
            ? 'http://localhost:8000/generate-code/karate' 
            : 'http://localhost:8000/generate-code/java';

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ testCases: testCasesPayload })
        });

        if (!response.ok) {
            throw new Error(`Error: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.generatedCode) {
            javaCodeBlock.textContent = data.generatedCode;
            javaCodeBlock.parentElement.scrollTop = 0;
            showToast(`${isKarateChecked ? 'Karate DSL' : 'Java'} code loaded`);
        } else {
            showToast("No code generated.");
        }

    } catch (err) {
        showToast(`Failed to switch code type: ${err.message}`);
    } finally {
        // Hide spinner and enable button
        spinner.style.display = 'none';
        generateCodeBtn.disabled = false;
        generateCodeBtn.textContent = 'Generate Code';
    }
}


// Copy code to clipboard
function copyCode() {
    const javaCodeBlock = document.getElementById("javaCodeBlock");
    if (!javaCodeBlock) {
        showToast("No code to copy.");
        return;
    }

    const range = document.createRange();
    range.selectNodeContents(javaCodeBlock);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);

    try {
        const successful = document.execCommand("copy");
        if (successful) {
            showToast("Code copied to clipboard!");
        } else {
            showToast("Failed to copy code.");
        }
    } catch (err) {
        showToast("Browser does not support copying to clipboard.");
    }

    selection.removeAllRanges();
}

// Optional: close modal if clicked outside (if you have a modal)
window.onclick = function(event) {
    const modal = document.getElementById("rawJsonModal");
    if (event.target === modal) {
        modal.style.display = "none";
    }
};

function displayGeneratedJavaCode(code) {
    const codeBlock = document.getElementById("javaCodeBlock");
    const outputContainer = document.getElementById("javaCodeOutput");

    codeBlock.textContent = code;
    outputContainer.style.display = "block";
}