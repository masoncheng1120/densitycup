(function () {
  // Paste your deployed Google Apps Script Web App URL here.
  const GOOGLE_SHEET_WEB_APP_URL = "https://script.google.com/macros/s/AKfycby0dCQmC3B-ICO6A3BZL__SArj3lbVAkDinisiw1dVi8foEwBLBn6yZIVTO8XH-uIvb/exec";
  const SCORE_STORAGE_KEY = "densityDecodedScores";

  const worksheet1Answers = {
    "A-mass": 44.32,
    "A-volume": 26,
    "B-mass": 19.91,
    "B-volume": 13,
    "C-mass": 54.01,
    "C-volume": 31,
    "D-mass": 16.26,
    "D-volume": 10,
    "E-mass": 8.18,
    "E-volume": 8,
    "F-mass": 45.94,
    "F-volume": 6
  };

  // Valid worksheet 2 answers computed from the puzzle rules (4 or 5 blocks, exactly one repeated).
  const worksheet2Answers = {
    "69": [{ double: "F", rest: ["A", "C"] }],
    "45": [{ double: "E", rest: ["B", "D", "F"] }],
    "81": [
      { double: "A", rest: ["B", "D", "F"] },
      { double: "C", rest: ["B", "F"] }
    ],
    "54": [{ double: "D", rest: ["A", "E"] }],
    "78": [{ double: "C", rest: ["D", "F"] }],
    "48": [
      { double: "E", rest: ["A", "F"] },
      { double: "F", rest: ["A", "D"] }
    ],
    "85": [
      { double: "C", rest: ["B", "D"] },
      { double: "D", rest: ["A", "C", "E"] }
    ],
    "51": [{ double: "F", rest: ["A", "B"] }],
    "72": [{ double: "D", rest: ["B", "C", "E"] }],
    "63": [
      { double: "B", rest: ["C", "F"] },
      { double: "E", rest: ["C", "D", "F"] }
    ]
  };

  function normalizeText(value) {
    return String(value || "").trim().toUpperCase();
  }

  function clearState(inputs) {
    inputs.forEach((input) => {
      input.classList.remove("correct", "wrong");
    });
  }

  function mark(input, ok) {
    input.classList.remove("correct", "wrong");
    input.classList.add(ok ? "correct" : "wrong");
  }

  function normalizeLetter(value) {
    return normalizeText(value).slice(0, 1);
  }

  function sortLetters(values) {
    return values.slice().sort().join("");
  }

  function getActiveGroupNumber() {
    const group1 = document.getElementById("group1");
    const group2 = document.getElementById("group2");
    return String((group1 && group1.value) || (group2 && group2.value) || "").trim();
  }

  function readStoredScores() {
    try {
      const raw = localStorage.getItem(SCORE_STORAGE_KEY);
      if (!raw) {
        return { groupNumber: "", worksheet1: null, worksheet2: null, lastSubmittedSignature: "" };
      }

      const parsed = JSON.parse(raw);
      return {
        groupNumber: String(parsed.groupNumber || ""),
        worksheet1: Number.isFinite(parsed.worksheet1) ? parsed.worksheet1 : null,
        worksheet2: Number.isFinite(parsed.worksheet2) ? parsed.worksheet2 : null,
        lastSubmittedSignature: String(parsed.lastSubmittedSignature || "")
      };
    } catch (_error) {
      return { groupNumber: "", worksheet1: null, worksheet2: null, lastSubmittedSignature: "" };
    }
  }

  function writeStoredScores(data) {
    localStorage.setItem(SCORE_STORAGE_KEY, JSON.stringify(data));
  }

  function saveWorksheetScore(worksheetKey, marks) {
    const saved = readStoredScores();
    const groupNumber = getActiveGroupNumber() || saved.groupNumber;
    const updated = {
      groupNumber,
      worksheet1: worksheetKey === "worksheet1" ? marks : saved.worksheet1,
      worksheet2: worksheetKey === "worksheet2" ? marks : saved.worksheet2,
      lastSubmittedSignature: saved.lastSubmittedSignature
    };
    writeStoredScores(updated);
    return updated;
  }

  async function trySubmitScoresToGoogleSheet(resultElement) {
    const saved = readStoredScores();

    if (!saved.groupNumber || saved.worksheet1 === null || saved.worksheet2 === null) {
      return;
    }

    if (!GOOGLE_SHEET_WEB_APP_URL.trim()) {
      resultElement.textContent += " | Saved locally. Add Google URL in script.js to sync.";
      return;
    }

    const total = saved.worksheet1 + saved.worksheet2;
    const signature = [saved.groupNumber, saved.worksheet1, saved.worksheet2, total].join("|");

    if (signature === saved.lastSubmittedSignature) {
      resultElement.textContent += " | Already synced.";
      return;
    }

    try {
      const formData = new URLSearchParams({
        groupNumber: saved.groupNumber,
        worksheet1: String(saved.worksheet1),
        worksheet2: String(saved.worksheet2),
        totalScore: String(total),
        timestamp: new Date().toISOString()
      });

      await fetch(GOOGLE_SHEET_WEB_APP_URL, {
        method: "POST",
        body: formData
      });

      writeStoredScores({
        groupNumber: saved.groupNumber,
        worksheet1: saved.worksheet1,
        worksheet2: saved.worksheet2,
        lastSubmittedSignature: signature
      });

      resultElement.textContent += ` | Synced to Sheet (Total: ${total}/52).`;
      resultElement.style.color = "#1f7a2f";
    } catch (_error) {
      resultElement.textContent += " | Sync failed. Check Google Sheet URL.";
      resultElement.style.color = "#b41f2b";
    }
  }

  async function checkWorksheet1() {
    const group = document.getElementById("group1");
    const result = document.getElementById("result-w1");
    const inputs = Array.from(document.querySelectorAll("input[data-w1]"));

    clearState(inputs);

    if (!group || !group.value.trim()) {
      result.textContent = "Please enter Group Number first.";
      result.style.color = "#b41f2b";
      return;
    }

    let score = 0;
    const total = inputs.length;

    inputs.forEach((input) => {
      const key = input.getAttribute("data-w1");
      const expected = worksheet1Answers[key];
      const got = parseFloat(input.value);
      const isMass = key.endsWith("-mass");
      const tolerance = isMass ? 0.1 : 0.01;
      const ok = Number.isFinite(got) && Math.abs(got - expected) <= tolerance;
      mark(input, ok);
      if (ok) score += 1;
    });

    result.textContent = `Marks: ${score} / ${total}`;
    result.style.color = score === total ? "#1f7a2f" : "#1f1b16";

    saveWorksheetScore("worksheet1", score);
    await trySubmitScoresToGoogleSheet(result);
  }

  function resetWorksheet1() {
    const inputs = Array.from(document.querySelectorAll("input[data-w1]"));
    const result = document.getElementById("result-w1");
    inputs.forEach((input) => {
      input.value = "";
      input.classList.remove("correct", "wrong");
    });
    if (result) result.textContent = "";
  }

  async function checkWorksheet2() {
    const group = document.getElementById("group2");
    const result = document.getElementById("result-w2");
    const inputs = Array.from(document.querySelectorAll("input[data-w2-double], input[data-w2-rest]"));
    const rows = Array.from(document.querySelectorAll("tr[data-w2-row]"));

    clearState(inputs);

    if (!group || !group.value.trim()) {
      result.textContent = "Please enter Group Number first.";
      result.style.color = "#b41f2b";
      return;
    }

    let correctRows = 0;
    const totalRows = rows.length;
    const marksPerRow = 4;
    const totalMarks = totalRows * marksPerRow;

    rows.forEach((row) => {
      const target = row.getAttribute("data-w2-row");
      const doubleInput = row.querySelector("input[data-w2-double]");
      const restInputs = Array.from(row.querySelectorAll("input[data-w2-rest]"));
      const rowInputs = [doubleInput].concat(restInputs);
      const options = worksheet2Answers[target] || [];
      const doubleValue = normalizeLetter(doubleInput.value);
      const restValues = restInputs.map((input) => normalizeLetter(input.value));
      const filteredRest = restValues.filter(Boolean);

      doubleInput.value = doubleValue;
      restInputs.forEach((input, index) => {
        input.value = restValues[index];
      });

      const ok = options.some((option) => {
        if (doubleValue !== option.double) {
          return false;
        }

        if (filteredRest.length !== option.rest.length) {
          return false;
        }

        return sortLetters(filteredRest) === sortLetters(option.rest);
      });

      rowInputs.forEach((input) => {
        mark(input, ok);
      });

      if (ok) correctRows += 1;
    });

    const marks = correctRows * marksPerRow;
    result.textContent = `Marks: ${marks} / ${totalMarks} (${correctRows} / ${totalRows} rows correct)`;
    result.style.color = marks === totalMarks ? "#1f7a2f" : "#1f1b16";

    saveWorksheetScore("worksheet2", marks);
    await trySubmitScoresToGoogleSheet(result);
  }

  function resetWorksheet2() {
    const inputs = Array.from(document.querySelectorAll("input[data-w2-double], input[data-w2-rest]"));
    const result = document.getElementById("result-w2");
    inputs.forEach((input) => {
      input.value = "";
      input.classList.remove("correct", "wrong");
    });
    if (result) result.textContent = "";
  }

  const check1 = document.getElementById("check-w1");
  const reset1 = document.getElementById("reset-w1");
  const check2 = document.getElementById("check-w2");
  const reset2 = document.getElementById("reset-w2");

  if (check1) check1.addEventListener("click", checkWorksheet1);
  if (reset1) reset1.addEventListener("click", resetWorksheet1);
  if (check2) check2.addEventListener("click", checkWorksheet2);
  if (reset2) reset2.addEventListener("click", resetWorksheet2);
})();
