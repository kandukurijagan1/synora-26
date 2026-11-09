import re

with open('google-apps-script/Code.gs', 'r', encoding='utf-8') as f:
    code = f.read()

# Replace handleCheckIn
start_checkin = code.find('function handleCheckIn(ss, params, callback)')
end_checkin = code.find('function handleUncheck(ss, params)', start_checkin)
checkin_orig = code[start_checkin:end_checkin]

new_checkin = """function handleCheckIn(ss, params, callback) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
  } catch (e) {
    return createJsonResponse({ status: "error", message: "Server busy, try again." }, callback);
  }

  try {
    params = params || {};
    ss = getSpreadsheet(ss);

    if (!ss) return createJsonResponse({ status: "error", message: "Google Sheet not accessible." }, callback);

    var query = String(params.teamId || params.id || params.email || params.phone || "").trim().toUpperCase();
    if (!query) return createJsonResponse({ status: "error", message: "Missing team ID." }, callback);

    var attSheet = getOrCreateSheet(ss, CONFIG.ATTENDANCE_SHEET);
    if (!attSheet) return createJsonResponse({ status: "error", message: "Could not access Attendance sheet." }, callback);

    var existingData = attSheet.getDataRange().getValues();
    for (var i = 1; i < existingData.length; i++) {
      if (String(existingData[i][1] || "").trim().toUpperCase() === query) {
        return createJsonResponse({ status: "success", message: "Already checked in." }, callback);
      }
    }

    var timestamp = Utilities.formatDate(new Date(), "GMT+05:30", "MM/dd/yyyy, hh:mm:ss a 'IST'");
    var verifier = params.organizerName || params.verifiedBy || "Reception Desk";
    
    attSheet.appendRow([
      timestamp, query, params.teamName || "", params.leaderName || "", params.leaderEmail || "", params.leaderPhone || "", params.member1Name || "", params.member2Name || "", params.member3Name || "", params.presentHeadcount || "", params.college || "", params.category || "", params.totalFee || "", params.txnId || "", verifier, "PRESENT"
    ]);

    SpreadsheetApp.flush();
    return createJsonResponse({ status: "success", message: "Check-in recorded!", timestamp: timestamp }, callback);
  } finally {
    lock.releaseLock();
  }
}

// ─── CHECK-OUT / UNCHECK HANDLER ─────────────────────────────────────────
"""

code = code.replace(checkin_orig, new_checkin)

# Replace handleUncheck
start_uncheck = code.find('function handleUncheck(ss, params)')
end_uncheck = code.find('function getAttendanceList(ss)', start_uncheck)
uncheck_orig = code[start_uncheck:end_uncheck]

new_uncheck = """function handleUncheck(ss, params) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
  } catch (e) {
    return createJsonResponse({ status: "error", message: "Server busy, try again." });
  }

  try {
    params = params || {};
    ss = getSpreadsheet(ss);

    var query = String(params.teamId || params.id || "").trim().toUpperCase();
    if (!query) return createJsonResponse({ status: "ready", message: "handleUncheck endpoint is ready." });

    var attSheet = getOrCreateSheet(ss, CONFIG.ATTENDANCE_SHEET);
    if (attSheet) {
      var attData = attSheet.getDataRange().getValues();
      for (var j = attData.length - 1; j >= 1; j--) {
        if (String(attData[j][1] || "").trim().toUpperCase() === query) {
          attSheet.deleteRow(j + 1);
          break;
        }
      }
      SpreadsheetApp.flush();
    }
    return createJsonResponse({ status: "success", message: "Attendance unregistered." });
  } finally {
    lock.releaseLock();
  }
}

// ─── GET ATTENDANCE LIST HANDLER ─────────────────────────────────────────
"""

code = code.replace(uncheck_orig, new_uncheck)

with open('google-apps-script/Code.gs', 'w', encoding='utf-8') as f:
    f.write(code)

print("Done replacing safely!")
