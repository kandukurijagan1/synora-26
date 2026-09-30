const fs = require('fs');
let code = fs.readFileSync('google_apps_script.js', 'utf8');

// 1. validateAdminAuth
code = code.replace(/if \(e && e\.parameter\) \{[\s\S]*?receivedKey = e\.parameter\.adminKey \|\| '';\s*\}/, 
`if (postData && postData.headers && postData.headers.Authorization) {
    var authHeader = postData.headers.Authorization;
    if (authHeader.startsWith("Bearer ")) receivedKey = authHeader.substring(7);
    else receivedKey = authHeader;
  } else if (postData && postData.Authorization) {
    var authStr = postData.Authorization;
    if (authStr.startsWith("Bearer ")) receivedKey = authStr.substring(7);
    else receivedKey = authStr;
  }`);

// 2. handleSendAdminOtp cache limit
code = code.replace(/if \(!isAuthorizedAdminEmail\(email\)\) \{[\s\S]*?\}, callback\);\s*\}/,
`if (!isAuthorizedAdminEmail(email)) {
    return createJsonResponse({
      status: "unauthorized",
      message: "Access Denied: '" + email + "' is not registered as an authorized organizer."
    }, callback);
  }

  var cache = CacheService.getScriptCache();
  var cacheKey = "OTP_RATE_LIMIT_" + email;
  if (cache.get(cacheKey)) {
    return createJsonResponse({
      status: "error",
      message: "Rate limit exceeded. Please wait a few minutes before requesting another OTP."
    }, callback);
  }`);
code = code.replace(/sendTelegramNotification\([^)]+\);/, `$&
    cache.put(cacheKey, "sent", 180);`);

// 3. handleRegistration validation
code = code.replace(/(\/\/ Strict Duplicate Check: Team Name)/,
`// SCHEMA & INPUT VALIDATION
  var emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
  if (params.leaderEmail && !emailRegex.test(params.leaderEmail)) {
    return createJsonResponse({ status: "error", message: "Invalid email format for Team Leader." });
  }
  if (!params.teamName || params.teamName.trim().length < 2) {
    return createJsonResponse({ status: "error", message: "Team Name must be at least 2 characters long." });
  }

  $1`);

// 4. logAdminAction
code = code.replace(/function setupAttendanceHeaders[^}]+}/, `$&

function setupAuditLogHeaders(sheet) {
  if (!sheet) return;
  if (sheet.getLastRow() === 0) {
    var headers = ["Timestamp", "Action", "Details"];
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#333333").setFontColor("#ffffff");
    sheet.setFrozenRows(1);
  }
}

function logAdminAction(action, details) {
  try {
    var ss = getSpreadsheet();
    if (!ss) return;
    var sheet = getOrCreateSheet(ss, "Admin_Audit_Logs");
    if (sheet.getLastRow() === 0) {
      setupAuditLogHeaders(sheet);
    }
    sheet.appendRow([formatISTDateTime(new Date()), action, typeof details === "string" ? details : JSON.stringify(details)]);
  } catch (e) {
    console.log("Audit log failed: " + e.toString());
  }
}`);

// 5. doPost admin logger and added routes
code = code.replace(/\/\/ 3\. ACTION: CHECK-IN \/ MARK ATTENDANCE/, 
`// AUDIT LOGGING FOR PROTECTED ACTIONS
    if (action && action !== "adminteams" && action !== "attendance" && action !== "stats") {
      var logData = Object.assign({}, mergedParams);
      delete logData.adminKey;
      delete logData.Authorization;
      if (logData.headers) delete logData.headers.Authorization;
      if (logData.attachments) logData.attachments = "[Attachments Array Hidden]";
      logAdminAction(action.toUpperCase(), logData);
    }

    // 3. ACTION: ADMIN TEAMS (Full PII Data)
    if (action === "adminteams") {
      var allAdminTeams = getAllTeamsFromRegistrationSheet(ss);
      return createJsonResponse({ status: "success", data: allAdminTeams, total: allAdminTeams.length });
    }

    // 4. ACTION: GET ALL PRESENT TEAMS (ATTENDANCE ROSTER)
    if (action === "attendance") {
      var attendanceData = getAttendanceList(ss);
      return createJsonResponse({ status: "success", data: attendanceData });
    }

    // 5. ACTION: DESK STATS
    if (action === "stats") {
      var meta = findRegistrationSheetAndColumnMap(ss);
      var attSheet = getOrCreateSheet(ss, CONFIG.ATTENDANCE_SHEET);
      var totalReg = (meta && meta.sheet) ? Math.max(0, meta.sheet.getLastRow() - 1) : 0;
      var totalCheckedIn = attSheet ? Math.max(0, attSheet.getLastRow() - 1) : 0;
      return createJsonResponse({
        status: "success",
        totalRegistered: totalReg,
        totalCheckedIn: totalCheckedIn,
        totalPending: Math.max(0, totalReg - totalCheckedIn)
      });
    }

    // 6. ACTION: PROCESS SCHEDULED EMAILS
    if (action === "processemails") {
      var processed = processPendingRegistrationEmails();
      return createJsonResponse({
        status: "success",
        message: "Email dispatch queue executed.",
        processedCount: processed
      });
    }

    // 7. ACTION: CHECK-IN / MARK ATTENDANCE`);
    
// Replace subsequent numbers in POST 
code = code.replace(/\/\/ 4\. ACTION: UNCHECK/, "// 8. ACTION: UNCHECK");
code = code.replace(/\/\/ 5\. ACTION: SEND PARTICIPATION CERTIFICATES/, "// 9. ACTION: SEND PARTICIPATION CERTIFICATES");
code = code.replace(/\/\/ 6\. ACTION: AUTO-REPAIR SHEET COLUMNS/, "// 10. ACTION: AUTO-REPAIR SHEET COLUMNS");

// 6. doGet routes and ALLOWALL removal
code = code.replace(/\.setXFrameOptionsMode\(HtmlService\.XFrameOptionsMode\.ALLOWALL\)\s*/, "");
code = code.replace(/\/\/ ═════════════════════════════════════════════════════════════════════[\s\S]*?(?=\/\/ ─── POST REQUEST ROUTER ───|function doPost\(e\))/, 
`// ═════════════════════════════════════════════════════════════════════
    // 🛡️ ADMIN ACTIONS NOW REQUIRE POST
    // ═════════════════════════════════════════════════════════════════════
    var protectedActions = ["adminteams", "checkin", "uncheck", "attendance", "stats", "processemails", "repair"];
    if (protectedActions.indexOf(action) !== -1) {
      return createJsonResponse({ 
        status: "error", 
        message: "Unauthorized: Admin privileges required. For security, admin actions must use POST methods with Authorization headers." 
      }, callback);
    }

    return createJsonResponse({ status: "error", message: "Unknown GET action: " + action }, callback);

  } catch (error) {
    Logger.log("❌ doGet error: " + error.toString());
    return createJsonResponse({
      status: "error",
      message: error.toString()
    }, e ? e.parameter?.callback : null);
  }
}

`);

// Optimize Cache execution for full sheet scans
code = code.replace(/function getAllTeamsFromRegistrationSheet\(ss\) \{/, 
`var _executionCache = {};
function _getCachedDataRange(sheet) {
  var id = sheet.getName();
  if (!_executionCache[id]) _executionCache[id] = sheet.getDataRange().getValues();
  return _executionCache[id];
}

function getAllTeamsFromRegistrationSheet(ss) {`);
code = code.replace(/var data = sheet\.getDataRange\(\)\.getValues\(\);/g, "var data = _getCachedDataRange(sheet);");

fs.writeFileSync('google_apps_script.js', code);
console.log('Successfully updated google_apps_script.js');
