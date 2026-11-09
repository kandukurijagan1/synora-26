const fs = require('fs');
let code = fs.readFileSync('google-apps-script/Code.gs', 'utf8');

const checkInStart = code.indexOf('function handleCheckIn(ss, params, callback)');
const uncheckStart = code.indexOf('function handleUncheck(ss, params)');
const getJsonStart = code.indexOf('function createJsonResponse(data, callback)', uncheckStart);

const newCheckIn = `function handleCheckIn(ss, params, callback) {
  params = params || {};
  ss = getSpreadsheet(ss);

  if (!ss) {
    return createJsonResponse({ status: "error", message: "Google Sheet not accessible." }, callback);
  }

  var query = String(params.teamId || params.id || params.email || params.phone || "").trim().toUpperCase();
  if (!query) {
    return createJsonResponse({ status: "error", message: "Missing team ID." }, callback);
  }

  var attSheet = getOrCreateSheet(ss, CONFIG.ATTENDANCE_SHEET);
  if (!attSheet) {
    return createJsonResponse({ status: "error", message: "Could not access Attendance sheet." }, callback);
  }

  var timestamp = Utilities.formatDate(new Date(), "GMT+05:30", "MM/dd/yyyy, hh:mm:ss a 'IST'");
  var verifier = params.organizerName || params.verifiedBy || "Reception Desk";
  
  attSheet.appendRow([
    timestamp,
    query,
    params.teamName || "",
    params.leaderName || "",
    params.leaderEmail || "",
    params.leaderPhone || "",
    params.member1Name || "",
    params.member2Name || "",
    params.member3Name || "",
    params.presentHeadcount || "",
    params.college || "",
    params.category || "",
    params.totalFee || "",
    params.txnId || "",
    verifier,
    "PRESENT"
  ]);

  return createJsonResponse({ status: "success", message: "Check-in recorded!", timestamp: timestamp }, callback);
}

`;

const newUncheck = `function handleUncheck(ss, params) {
  params = params || {};
  ss = getSpreadsheet(ss);

  var query = String(params.teamId || params.id || "").trim().toUpperCase();
  if (!query) {
    return createJsonResponse({ status: "ready", message: "handleUncheck endpoint is ready." });
  }

  var attSheet = getOrCreateSheet(ss, CONFIG.ATTENDANCE_SHEET);
  if (attSheet) {
    var attData = attSheet.getDataRange().getValues();
    for (var j = attData.length - 1; j >= 1; j--) {
      if (String(attData[j][1] || "").trim().toUpperCase() === query) {
        attSheet.deleteRow(j + 1);
        break;
      }
    }
  }

  return createJsonResponse({ status: "success", message: "Attendance unregistered." });
}

`;

code = code.substring(0, checkInStart) + newCheckIn + newUncheck + code.substring(getJsonStart);
fs.writeFileSync('google-apps-script/Code.gs', code);
console.log('Successfully optimized Apps Script for speed!');
