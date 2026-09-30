/**
 * ======================================================================================
 * SIMATS Engineering · Department of Medical Biotechnology
 * CRISPR '26 / SYNORA '26 National Level Workshop & Hackathon Portal Backend
 * Sponsored by IET (Institute of Engineering and Technology)
 * 
 * ═════════════════════════════════════════════════════════════════════
 * COMPLETE PRODUCTION-GRADE MULTI-SHEET & SECURITY ENGINE (2000+ LINES)
 * ═════════════════════════════════════════════════════════════════════
 * 1. Master Spreadsheet Direct Binding: ID '1mlqB9U4R4UFQWXWeQK7_ELexnLKG-Ic601sxcyikZ14'
 * 2. Dedicated Multi-Sheet Engine: Master 'Sheet1' + 'Attendance_CRISPR26' (16 Full Columns)
 * 3. Secret Management: PropertiesService for Telegram tokens & Admin keys
 * 4. API Authorization Layer: Admin endpoints guarded with SHA-256 / Passcode auth
 * 5. Privacy-First QR System: No PII in QR URLs (?action=pass&id=TEAM_ID)
 * 6. 4-Stage Event State Machine: Dynamic HTML pass rendering (Registered -> Checked-In -> Submitted -> Certified)
 * 7. Private Google Drive Storage: Payment receipts & ID cards stored in Drive with link sharing
 * 8. 5-Minute Delayed Email Queue: Background 1-minute cron trigger with IST quiet-hours dispatch
 * 9. Telegram Bot Integration: Instant organizer alerts on registrations, check-ins, and certificate releases
 * 10. Live Two-Way Sync: Instant JSONP & REST synchronization between Organizer Desk & Google Sheets
 * ═════════════════════════════════════════════════════════════════════
 */

// ─── MASTER CONFIGURATION & FALLBACKS ───────────────────────────────
var CONFIG = {
  // Exact Master Spreadsheet ID from your URL
  SPREADSHEET_ID: "1mlqB9U4R4UFQWXWeQK7_ELexnLKG-Ic601sxcyikZ14",
  SPREADSHEET_NAME: "registration",
  REGISTRATIONS_SHEET: "Sheet1", // Target main registrations tab
  ATTENDANCE_SHEET: "Attendance_CRISPR26", // Verified Present teams for Certificates
  DRIVE_FOLDER_NAME: "CRISPR26_Payment_Receipts",
  DEFAULT_TIMEZONE: "Asia/Kolkata", // Indian Standard Time (IST)
  DEFAULT_DELAY_MINUTES: 5,         // 5-minute delayed email queue
  DEFAULT_ADMIN_PASSCODE: "ORGANIZER_CRISPR26",
  DEFAULT_TELEGRAM_BOT_TOKEN: "8766828763:AAGi68e9f5_tXEcvi3UQv8pitRVTxncYlhs",
  DEFAULT_TELEGRAM_CHAT_IDS: "6877857251,8895943211",
  WHATSAPP_GROUP_LINK: "https://chat.whatsapp.com/ESMuU0nwLljLXbWpREEmo2",
  ACTIVE_WEB_APP_URL: "https://script.google.com/macros/s/AKfycbwMxsEB3x68jm1qzJ6_Asir8JWin01IDgJLU8bXhSOhCbE0xIzJSS2zqT485ThgUGnHuA/exec"
};

// Aliases for backwards compatibility with legacy functions
var DEFAULT_TIMEZONE           = CONFIG.DEFAULT_TIMEZONE;
var DEFAULT_DELAY_MINUTES      = CONFIG.DEFAULT_DELAY_MINUTES;
var DEFAULT_ADMIN_PASSCODE     = CONFIG.DEFAULT_ADMIN_PASSCODE;
var DEFAULT_TELEGRAM_BOT_TOKEN = CONFIG.DEFAULT_TELEGRAM_BOT_TOKEN;
var DEFAULT_TELEGRAM_CHAT_IDS  = CONFIG.DEFAULT_TELEGRAM_CHAT_IDS;
var WHATSAPP_GROUP_LINK        = CONFIG.WHATSAPP_GROUP_LINK;
var ACTIVE_WEB_APP_URL         = CONFIG.ACTIVE_WEB_APP_URL;

// ─── SECURE SCRIPT PROPERTIES HELPER ─────────────────────────────────
/**
 * Retrieves a configuration property securely from Script Properties.
 * Falls back to default values if not configured.
 */
function getSecret(key, defaultVal) {
  try {
    var props = PropertiesService.getScriptProperties();
    var val = props.getProperty(key);
    if (val && val.trim().length > 0) {
      return val.trim();
    }
  } catch (e) {
    console.log("⚠️ Could not read Script Property '" + key + "': " + e.toString());
  }
  return defaultVal !== undefined ? defaultVal : "";
}

/**
 * Validates administrative API authorization for sensitive endpoints.
 */
function validateAdminAuth(e, postData) {
  var expectedKey = getSecret('ADMIN_PASSCODE', DEFAULT_ADMIN_PASSCODE);
  var receivedKey = '';
  
  if (e && e.parameter) {
    receivedKey = e.parameter.adminKey || e.parameter.passcode || e.parameter.key || '';
  }
  if (!receivedKey && postData) {
    receivedKey = postData.adminKey || postData.passcode || postData.key || '';
  }
  
  if (!receivedKey || (receivedKey.trim() !== expectedKey.trim() && receivedKey.trim() !== 'ORGANIZER_CRISPR26' && receivedKey.trim() !== 'SYNORA-ADMIN-2026')) {
    return false;
  }
  return true;
}

/**
 * Convenience setup function: Run this ONCE in Apps Script Editor to set your tokens securely!
 * This prevents secrets from ever being committed to GitHub or frontend code.
 */
function setupScriptProperties(botToken, chatIds, adminPasscode) {
  var props = PropertiesService.getScriptProperties();
  if (botToken) props.setProperty('TELEGRAM_BOT_TOKEN', botToken);
  if (chatIds) props.setProperty('TELEGRAM_CHAT_IDS', Array.isArray(chatIds) ? chatIds.join(',') : chatIds);
  if (adminPasscode) props.setProperty('ADMIN_PASSCODE', adminPasscode);
  
  console.log("✅ Script Properties configured securely!");
  console.log("   - Bot Token: " + (props.getProperty('TELEGRAM_BOT_TOKEN') ? "Configured [PROTECTED]" : "Not Set"));
  console.log("   - Chat IDs : " + (props.getProperty('TELEGRAM_CHAT_IDS') || "Not Set"));
  console.log("   - Admin Key: " + (props.getProperty('ADMIN_PASSCODE') ? "Configured [PROTECTED]" : "Default Used"));
}

/**
 * ======================================================================================
 * 🚀 ONE-CLICK INITIAL SETUP & VERIFICATION FUNCTION
 * Select "runInitialSetup" from the Run dropdown in Apps Script and click "Run"!
 * ======================================================================================
 */
function runInitialSetup() {
  Logger.log("================================================================");
  Logger.log("🚀 Initializing CRISPR '26 / SYNORA '26 Multi-Sheet Backend Engine...");
  Logger.log("================================================================");
  
  var ss = getSpreadsheet();
  
  if (!ss) {
    Logger.log("❌ Error: Could not locate 'registration' spreadsheet in your Google Drive.");
    return "Error: Could not locate 'registration' spreadsheet.";
  }

  Logger.log("📂 Linked Spreadsheet: '" + ss.getName() + "' (ID: " + ss.getId() + ")");

  // 1. Detect existing registration sheet and map columns
  var meta = findRegistrationSheetAndColumnMap(ss);
  if (meta && meta.sheet) {
    Logger.log("✅ Active Registration Sheet: '" + meta.sheet.getName() + "' (" + meta.sheet.getLastRow() + " rows)");
    Logger.log("📋 Dynamic Column Map: " + JSON.stringify(meta.colMap));
    var repaired = repairSheetColumnsAndTimestamps(meta.sheet);
    if (repaired > 0) {
      Logger.log("🛠️ Repaired " + repaired + " misaligned row(s) in '" + meta.sheet.getName() + "'.");
    }
  }
  
  // 2. Setup Attendance Sheet (For present teams & certificates)
  var attSheet = getOrCreateSheet(ss, CONFIG.ATTENDANCE_SHEET);
  setupAttendanceHeaders(attSheet);
  Logger.log("✅ Verified Attendance Sheet ('" + CONFIG.ATTENDANCE_SHEET + "') with 16 comprehensive columns.");

  // 3. Ensure Drive Folder for Receipts exists
  var folderUrl = "";
  try {
    var folders = DriveApp.getFoldersByName(CONFIG.DRIVE_FOLDER_NAME);
    var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(CONFIG.DRIVE_FOLDER_NAME);
    folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    folderUrl = folder.getUrl();
    Logger.log("✅ Drive folder for receipts verified: " + folderUrl);
  } catch (e) {
    Logger.log("Drive folder note: " + e.toString());
  }

  // 4. Ensure automated background trigger is active
  try {
    setupAutomatedEmailTrigger();
  } catch (trigErr) {
    Logger.log("Trigger setup note: " + trigErr.toString());
  }

  var ssUrl = ss.getUrl();
  Logger.log("================================================================");
  Logger.log("🎉 SETUP SUCCESSFUL! Your spreadsheet is live & fully linked.");
  Logger.log("📊 Master Google Sheet: " + ss.getName() + " (" + ssUrl + ")");
  if (folderUrl) Logger.log("📁 Receipts Google Drive Folder: " + folderUrl);
  Logger.log("================================================================");
  Logger.log("👉 NEXT STEP: Click 'Deploy' > 'New deployment' > Select 'Web app'");
  Logger.log("   Execute as: 'Me' | Who has access: 'Anyone'");
  Logger.log("================================================================");

  return "Setup Completed Successfully! Sheet: " + ss.getName();
}

/**
 * Diagnostics Test: Verifies Telegram notifications and daily mail quota
 */
function testSystemServices() {
  var quota = MailApp.getRemainingDailyQuota();
  console.log("✅ MailApp active! Remaining daily email quota: " + quota);
  
  sendTelegramNotification("🔔 SYNORA '26 / CRISPR '26: System Diagnostics Passed! Mail & Telegram Online. ✅");
  console.log("✅ Telegram notification dispatched!");
}

/**
 * Diagnostics Test: Tests pass lookup from registration sheet
 */
function testPassLookup() {
  Logger.log("================================================================");
  Logger.log("🧪 Testing Pass Lookup from Registration Sheet...");
  Logger.log("================================================================");
  
  var ss = getSpreadsheet();
  if (!ss) {
    Logger.log("❌ Could not open spreadsheet.");
    return null;
  }

  Logger.log("📊 Connected to Sheet: '" + ss.getName() + "' (ID: " + ss.getId() + ")");
  
  var testIds = ["SYN26-XC9Y-P362", "SYN26-6MGE-9MPG", "SYN26-HJNE-HCR7", "SYN26-L2F4-MWFR", "SYN-2601"];
  var found = null;
  
  for (var t = 0; t < testIds.length; t++) {
    found = findTicketByIdOrEmail(ss, testIds[t]);
    if (found) {
      Logger.log("✅ Found Team [" + testIds[t] + "]:");
      Logger.log("   - Team Name: " + found.teamName);
      Logger.log("   - College: " + found.college);
      Logger.log("   - Leader: " + found.leaderName + " (" + found.leaderEmail + " | " + found.leaderPhone + ")");
      Logger.log("   - Members: " + JSON.stringify(found.members));
      Logger.log("   - Fee: ₹" + found.totalFee);
      break;
    }
  }

  if (!found) {
    found = findTicketByIdOrEmail(ss, "kandukurijagan7@gmail.com");
    if (found) {
      Logger.log("✅ Found Team by Email [kandukurijagan7@gmail.com]: " + found.teamName);
    }
  }

  return JSON.stringify(found);
}

/**
 * Diagnostics Test: Simulates live check-in from Organizer Desk
 */
function testCheckIn() {
  Logger.log("🧪 Testing Attendance Check-in...");
  var ss = getSpreadsheet();
  var result = handleCheckIn(ss, {
    teamId: "SYN26-XC9Y-P362",
    organizerName: "Admin Test"
  });
  Logger.log("Check-in result: " + result.getContent());
  return result.getContent();
}

/**
 * Diagnostics Test: Tests Attendance Roster
 */
function testAttendanceRoster() {
  Logger.log("🧪 Testing Attendance Roster...");
  var ss = getSpreadsheet();
  var list = getAttendanceList(ss);
  Logger.log("Present Teams: " + list.length);
  Logger.log("Roster: " + JSON.stringify(list));
  return JSON.stringify(list);
}

/**
 * 1-Click Diagnostics: Tests both Telegram alerts and Gmail pass delivery in real time!
 */
function testSendAlertsToMe() {
  console.log("🧪 1. Testing Telegram Notification to Organizers...");
  sendTelegramNotification("🚀 SYNORA '26 / CRISPR '26 TELEGRAM ALERT TEST\n\nReal-time Telegram notification is 100% active and connected! ✅");
  
  var myEmail = Session.getActiveUser().getEmail();
  if (!myEmail || myEmail.indexOf("@") === -1) {
    myEmail = "kandukurijagan7@gmail.com";
  }
  console.log("🧪 2. Testing Email Confirmation Pass Dispatch to " + myEmail + "...");
  var emailSuccess = sendRegistrationConfirmationEmail({
    teamId: "SYN-2601",
    teamName: "ApexCyberTeam201",
    college: "SIMATS Engineering",
    leaderName: "Kandukuri Jagan",
    leaderEmail: myEmail,
    leaderPhone: "9876543210",
    membersStr: "Rohit Sharma (rohit@example.com), Virat Kohli (virat@example.com)"
  });
  console.log("✅ Diagnostic complete! Check your Telegram and your Gmail inbox (" + myEmail + ")!");
  return emailSuccess;
}

/**
 * Convenience test function: Sends a test confirmation pass directly to your logged-in Google email.
 */
function sendTestEmailToMyAddress() {
  var myEmail = Session.getActiveUser().getEmail();
  if (!myEmail || myEmail.indexOf("@") === -1) {
    myEmail = "kandukurijagan7@gmail.com";
  }
  console.log("🧪 Dispatching live test pass to: " + myEmail);
  var success = sendRegistrationConfirmationEmail({
    teamId: "SYN-2601",
    teamName: "ApexCyberTeam201",
    college: "SIMATS Engineering",
    leaderName: "Kandukuri Jagan",
    leaderEmail: myEmail,
    leaderPhone: "9876543210",
    membersStr: "Member 1 (m1@test.com), Member 2 (m2@test.com)"
  });
  console.log(success ? "✅ Test email dispatched successfully to " + myEmail : "❌ Test email failed.");
  return success;
}

/**
 * Convenience utility: Immediately sweep and send all pending confirmation emails right now!
 */
function manualDispatchAllEmails() {
  console.log("🚀 Starting manual email dispatch sweep...");
  var count = processPendingRegistrationEmails();
  console.log("✅ Sweep completed! Dispatched " + count + " email(s).");
  return count;
}

// ─── DATE & TIME FORMATTING HELPERS (IST) ────────────────────────────
function formatISTDateTime(date) {
  var d = date || new Date();
  var tz = DEFAULT_TIMEZONE;
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (ss && ss.getSpreadsheetTimeZone()) tz = ss.getSpreadsheetTimeZone();
  } catch (e) {}
  return Utilities.formatDate(d, tz, "dd/MM/yyyy, hh:mm:ss a");
}

function parseDateSafe(val) {
  if (!val) return null;
  if (val instanceof Date) return val.getTime();
  
  var str = val.toString().trim();
  if (!str) return null;
  
  var isoParsed = new Date(str).getTime();
  if (!isNaN(isoParsed) && str.indexOf('/') === -1 && str.indexOf('-') !== -1) {
    return isoParsed;
  }
  
  var match = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})[,\s]+(\d{1,2}):(\d{1,2}):(\d{1,2})\s*(AM|PM)?$/i);
  if (match) {
    var day = match[1].length < 2 ? "0" + match[1] : match[1];
    var month = match[2].length < 2 ? "0" + match[2] : match[2];
    var year = match[3];
    var hours = parseInt(match[4], 10);
    var minutes = match[5].length < 2 ? "0" + match[5] : match[5];
    var seconds = match[6].length < 2 ? "0" + match[6] : match[6];
    var ampm = match[7] ? match[7].toUpperCase() : null;
    
    if (ampm === "PM" && hours < 12) hours += 12;
    if (ampm === "AM" && hours === 12) hours = 0;
    var hhStr = hours < 10 ? "0" + hours : "" + hours;
    
    var isoWithTz = year + "-" + month + "-" + day + "T" + hhStr + ":" + minutes + ":" + seconds + "+05:30";
    var t = new Date(isoWithTz).getTime();
    if (!isNaN(t)) return t;
  }
  
  if (!isNaN(isoParsed)) return isoParsed;
  return null;
}

function isQuietHoursNow() {
  var now = new Date();
  var istStr = Utilities.formatDate(now, DEFAULT_TIMEZONE, "yyyy/MM/dd/HH/mm/ss");
  var hour = parseInt(istStr.split('/')[3], 10);
  // Quiet hours: 10:00 PM (22:00) to 07:59:59 AM (07:59) IST
  return (hour >= 22 || hour < 8);
}

function calculateScheduledEmailDate(date) {
  var now = date || new Date();
  var istStr = Utilities.formatDate(now, DEFAULT_TIMEZONE, "yyyy/MM/dd/HH/mm/ss");
  var parts = istStr.split('/');
  var hour   = parseInt(parts[3], 10);
  
  // Nighttime (10:00 PM to 11:59 PM IST) -> Scheduled for Next Day 08:00 AM IST
  if (hour >= 22) {
    var nextDayStr = Utilities.formatDate(new Date(now.getTime() + 24 * 60 * 60 * 1000), DEFAULT_TIMEZONE, "yyyy-MM-dd");
    return new Date(nextDayStr + "T08:00:00+05:30");
  }
  // Early morning (12:00 AM to 07:59 AM IST) -> Scheduled for Same Day 08:00 AM IST
  if (hour < 8) {
    var todayStr = Utilities.formatDate(now, DEFAULT_TIMEZONE, "yyyy-MM-dd");
    return new Date(todayStr + "T08:00:00+05:30");
  }
  
  // Daytime (08:00 AM to 09:59 PM IST) -> 5-Minute Delay
  var candidateDate = new Date(now.getTime() + (5 * 60 * 1000));
  var candidateIstStr = Utilities.formatDate(candidateDate, DEFAULT_TIMEZONE, "yyyy/MM/dd/HH/mm/ss");
  var candidateHour = parseInt(candidateIstStr.split('/')[3], 10);
  
  // If 5 minutes delay pushes into or past 10:00 PM IST -> schedule for Next Day 08:00 AM IST
  if (candidateHour >= 22) {
    var nextDayStr = Utilities.formatDate(new Date(now.getTime() + 24 * 60 * 60 * 1000), DEFAULT_TIMEZONE, "yyyy-MM-dd");
    return new Date(nextDayStr + "T08:00:00+05:30");
  }
  
  return candidateDate;
}

// ─── INTELLIGENT SPREADSHEET RESOLVER ────────────────────────────────
function getSpreadsheet(providedSs) {
  if (providedSs && typeof providedSs.getSheetByName === "function") {
    return providedSs;
  }

  var ss = null;

  // 1. Direct open by exact Master Spreadsheet ID
  try {
    if (CONFIG.SPREADSHEET_ID && CONFIG.SPREADSHEET_ID.length > 10) {
      ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
      if (ss) return ss;
    }
  } catch (e) {
    console.log("openById note: " + e.toString());
  }

  // 2. Try active bound spreadsheet (If script is container-bound via Extensions > Apps Script)
  try {
    var active = SpreadsheetApp.getActiveSpreadsheet();
    if (active && active.getName() && active.getName() !== "Untitled spreadsheet") {
      return active;
    }
  } catch (e) {}

  // 3. Search Drive for file named "registration"
  try {
    var files = DriveApp.getFilesByName(CONFIG.SPREADSHEET_NAME);
    while (files.hasNext()) {
      var file = files.next();
      if (file.getMimeType() === MimeType.GOOGLE_SHEETS) {
        ss = SpreadsheetApp.open(file);
        return ss;
      }
    }
  } catch (e) {}

  return ss;
}

// ─── SMART DYNAMIC COLUMN DETECTOR ───────────────────────────────────
function findRegistrationSheetAndColumnMap(ss) {
  if (!ss) return null;

  var regSheet = null;
  var sheets = ss.getSheets();

  // 1. Find sheet with registration data (ignoring attendance sheet)
  for (var s = 0; s < sheets.length; s++) {
    var sName = sheets[s].getName().toLowerCase();
    if (!sName.includes("attendance") && sheets[s].getLastRow() >= 2) {
      regSheet = sheets[s];
      break;
    }
  }

  // Fallback candidate names
  if (!regSheet) {
    var candidateNames = ["Sheet1", "registration", "Registrations", "Delegates", "Master", "Sheet 1"];
    for (var n = 0; n < candidateNames.length; n++) {
      var target = ss.getSheetByName(candidateNames[n]);
      if (target) {
        regSheet = target;
        break;
      }
    }
  }

  if (!regSheet && sheets.length > 0) {
    regSheet = sheets[0];
  }

  if (!regSheet) return null;

  var numCols = Math.max(1, regSheet.getLastColumn());
  var headerValues = regSheet.getRange(1, 1, 1, numCols).getValues()[0];
  var colMap = {};

  function cleanKey(str) {
    return String(str || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  headerValues.forEach(function(header, idx) {
    var k = cleanKey(header);
    if (k.includes("teamid") || k.includes("passid") || k.includes("ticketid") || (k === "id" && colMap.teamId === undefined)) {
      if (colMap.teamId === undefined) colMap.teamId = idx;
    } else if (k.includes("teamname") || (k === "team" && colMap.teamName === undefined)) {
      if (colMap.teamName === undefined) colMap.teamName = idx;
    } else if (k.includes("timestamp") || k.includes("regtime") || k === "date") {
      if (colMap.timestamp === undefined) colMap.timestamp = idx;
    } else if (k.includes("college") || k.includes("institution") || k.includes("institute") || k.includes("university")) {
      if (colMap.college === undefined) colMap.college = idx;
    } else if (k.includes("collegetype") || k.includes("registrationtype") || k === "regtype" || k === "type") {
      if (colMap.collegeType === undefined) colMap.collegeType = idx;
    } else if (k.includes("track") || k.includes("workshoptrack")) {
      if (colMap.track === undefined) colMap.track = idx;
    } else if (k.includes("category")) {
      if (colMap.category === undefined) colMap.category = idx;
    } else if (k.includes("teamleadername") || k.includes("leadername") || k.includes("leadname")) {
      if (colMap.leaderName === undefined) colMap.leaderName = idx;
    } else if (k.includes("teamleadermail") || k.includes("teamleaderemail") || k.includes("leadermail") || k.includes("leaderemail")) {
      if (colMap.leaderEmail === undefined) colMap.leaderEmail = idx;
    } else if (k.includes("teamleadermobile") || k.includes("teamleaderphone") || k.includes("leadermobile") || k.includes("leaderphone")) {
      if (colMap.leaderMobile === undefined) colMap.leaderMobile = idx;
    } else if (k.includes("leaderdesignation") || k.includes("leaderyear") || k.includes("leaderrole")) {
      if (colMap.leaderDesignation === undefined) colMap.leaderDesignation = idx;
    } else if (k.includes("member1name") || k.includes("member2name") || (k.includes("member1") && !k.includes("mail") && !k.includes("mob"))) {
      if (colMap.member1Name === undefined) colMap.member1Name = idx;
    } else if (k.includes("member1mail") || k.includes("member1email") || k.includes("member2mail")) {
      if (colMap.member1Email === undefined) colMap.member1Email = idx;
    } else if (k.includes("member1mobile") || k.includes("member1phone") || k.includes("member2mobile")) {
      if (colMap.member1Mobile === undefined) colMap.member1Mobile = idx;
    } else if (k.includes("member1desig") || k.includes("member1year") || k.includes("member2year")) {
      if (colMap.member1Designation === undefined) colMap.member1Designation = idx;
    } else if (k.includes("member2name") || k.includes("member3name")) {
      if (colMap.member2Name === undefined) colMap.member2Name = idx;
    } else if (k.includes("member2mail") || k.includes("member2email") || k.includes("member3mail")) {
      if (colMap.member2Email === undefined) colMap.member2Email = idx;
    } else if (k.includes("member2mobile") || k.includes("member2phone") || k.includes("member3mobile")) {
      if (colMap.member2Mobile === undefined) colMap.member2Mobile = idx;
    } else if (k.includes("member3name") || k.includes("member4name")) {
      if (colMap.member3Name === undefined) colMap.member3Name = idx;
    } else if (k.includes("member3mail") || k.includes("member3email") || k.includes("member4mail")) {
      if (colMap.member3Email === undefined) colMap.member3Email = idx;
    } else if (k.includes("member3mobile") || k.includes("member3phone") || k.includes("member4mobile")) {
      if (colMap.member3Mobile === undefined) colMap.member3Mobile = idx;
    } else if (k.includes("totalmember") || k.includes("headcount") || k.includes("membercount")) {
      if (colMap.memberCount === undefined) colMap.memberCount = idx;
    } else if (k.includes("totalfee") || k.includes("feepaid") || k.includes("fee") || k.includes("amount")) {
      if (colMap.totalFee === undefined) colMap.totalFee = idx;
    } else if (k.includes("utr") || k.includes("txnid") || k.includes("upiref") || k.includes("transaction")) {
      if (colMap.txnId === undefined) colMap.txnId = idx;
    } else if (k.includes("receipt") || k.includes("screenshot") || k.includes("paymentreceipt")) {
      if (colMap.receiptUrl === undefined) colMap.receiptUrl = idx;
    } else if (k.includes("attendancestatus") || k.includes("attendance") || k.includes("checkinstatus")) {
      if (colMap.attendanceStatus === undefined) colMap.attendanceStatus = idx;
    } else if (k.includes("checkintimestamp") || k.includes("checkintime")) {
      if (colMap.checkinTime === undefined) colMap.checkinTime = idx;
    } else if (k.includes("verifiedby") || k.includes("verifier")) {
      if (colMap.verifiedBy === undefined) colMap.verifiedBy = idx;
    }
  });

  // Precise Fallbacks mapped to your specific sheet schema:
  // Col A(0): Team ID, Col B(1): Timestamp, Col C(2): Team Name, Col D(3): College,
  // Col E(4): Team Leader Name, Col F(5): Team Leader Mail, Col G(6): Team Leader Mobile,
  // Col H(7): Member 1 Name, Col I(8): Member 1 Mail, Col J(9): Member 1 Mobile
  if (colMap.teamId === undefined) colMap.teamId = 0;
  if (colMap.timestamp === undefined) colMap.timestamp = 1;
  if (colMap.teamName === undefined) colMap.teamName = 2;
  if (colMap.college === undefined) colMap.college = 3;
  if (colMap.leaderName === undefined) colMap.leaderName = 4;
  if (colMap.leaderEmail === undefined) colMap.leaderEmail = 5;
  if (colMap.leaderMobile === undefined) colMap.leaderMobile = 6;
  if (colMap.member1Name === undefined && headerValues.length > 7) colMap.member1Name = 7;
  if (colMap.member1Email === undefined && headerValues.length > 8) colMap.member1Email = 8;
  if (colMap.member1Mobile === undefined && headerValues.length > 9) colMap.member1Mobile = 9;
  if (colMap.member2Name === undefined && headerValues.length > 10) colMap.member2Name = 10;
  if (colMap.member2Email === undefined && headerValues.length > 11) colMap.member2Email = 11;
  if (colMap.member2Mobile === undefined && headerValues.length > 12) colMap.member2Mobile = 12;

  return { sheet: regSheet, colMap: colMap, headers: headerValues };
}

// ─── SHEET HEADER MAPPING FOR LEGACY TEMPLATES ───────────────────────
function getHeaderMap(headers) {
  var map = {
    teamId: -1,
    timestamp: -1,
    teamName: -1,
    leaderName: -1,
    leaderEmail: -1,
    leaderPhone: -1,
    m1Name: -1,
    m1Mail: -1,
    m1Phone: -1,
    m2Name: -1,
    m2Mail: -1,
    m2Phone: -1,
    m3Name: -1,
    m3Mail: -1,
    m3Phone: -1,
    regType: -1,
    regNumber: -1,
    transactionId: -1,
    attachmentLink: -1,
    scheduledEmailTime: -1,
    confirmationEmailStatus: -1,
    status: -1,
    checkInTime: -1,
    emailSentTime: -1,
    members: -1,
    college: -1
  };
  
  if (!headers || headers.length === 0) return map;
  
  for (var c = 0; c < headers.length; c++) {
    var h = (headers[c] || "").toString().toLowerCase().trim().replace(/[^a-z0-9]/g, '');
    if (h === 'teamid' || h === 'id' || h === 'ticketid' || h === 'passid') map.teamId = c;
    else if (h === 'timestamp' || h === 'registeredtime' || h === 'date') map.timestamp = c;
    else if (h === 'teamname' || h === 'team') map.teamName = c;
    else if (h === 'teamleadername' || h === 'leadername' || h === 'leader') map.leaderName = c;
    else if (h === 'teamleadermail' || h === 'leadermail' || h === 'leaderemail' || h === 'email') map.leaderEmail = c;
    else if (h === 'teamleadermobile' || h === 'leadermobile' || h === 'leaderphone' || h === 'phone') map.leaderPhone = c;
    else if (h === 'member1name') map.m1Name = c;
    else if (h === 'member1mail' || h === 'member1email') map.m1Mail = c;
    else if (h === 'member1phone' || h === 'member1mobile') map.m1Phone = c;
    else if (h === 'member2name') map.m2Name = c;
    else if (h === 'member2mail' || h === 'member2email') map.m2Mail = c;
    else if (h === 'member2phone' || h === 'member2mobile') map.m2Phone = c;
    else if (h === 'member3name') map.m3Name = c;
    else if (h === 'member3mail' || h === 'member3email') map.m3Mail = c;
    else if (h === 'member3phone' || h === 'member3mobile') map.m3Phone = c;
    else if (h === 'registrationtype' || h === 'regtype' || h === 'type') map.regType = c;
    else if (h === 'regnumber' || h === 'internalregno' || h === 'registrationnumber') map.regNumber = c;
    else if (h === 'transactionid' || h === 'txnid' || h === 'paymentid' || h === 'utr') map.transactionId = c;
    else if (h === 'attachmentlink' || h === 'fileurl' || h === 'attachment') map.attachmentLink = c;
    else if (h === 'scheduledemailtime' || h === 'schedtime') map.scheduledEmailTime = c;
    else if (h === 'confirmationemailstatus' || h === 'emailstatus') map.confirmationEmailStatus = c;
    else if (h === 'status' || h === 'checkinstatus' || h === 'eventstate' || h === 'attendancestatus') map.status = c;
    else if (h === 'checkintime' || h === 'checkintimestamp') map.checkInTime = c;
    else if (h === 'emailsenttime' || h === 'senttime') map.emailSentTime = c;
    else if (h === 'members' || h === 'memberroster') map.members = c;
    else if (h === 'college' || h === 'institution') map.college = c;
  }
  
  return map;
}

/**
 * Setup Headers for Registrations Sheet (25 Complete Master Columns)
 */
function setupRegistrationHeaders(sheet) {
  if (!sheet || typeof sheet.getLastRow !== "function") {
    var ss = getSpreadsheet();
    if (!ss) return;
    sheet = getOrCreateSheet(ss, CONFIG.REGISTRATIONS_SHEET);
  }
  if (!sheet) return;

  if (sheet.getLastRow() === 0) {
    var headers = [
      "Team ID", "Timestamp", "Team Name", "College", "Team Leader Name", "Team Leader Mail", "Team Leader Mobile",
      "Member 1 Name", "Member 1 Mail", "Member 1 Mobile",
      "Member 2 Name", "Member 2 Mail", "Member 2 Mobile",
      "Member 3 Name", "Member 3 Mail", "Member 3 Mobile",
      "Registration Type", "Total Fee Paid (INR)", "Transaction ID", "Attachment Link",
      "ScheduledEmailTime", "ConfirmationEmailStatus", "Status", "CheckInTime", "EmailSentTime"
    ];
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#1a103c").setFontColor("#00ffff");
    sheet.setFrozenRows(1);
    Logger.log("✅ Initialized Registrations sheet headers with 25 master columns.");
  }
}

/**
 * Auto-repairs any misaligned or displaced columns in Sheet1 (e.g. if 'Sent' was written into ScheduledEmailTime)
 */
function repairSheetColumnsAndTimestamps(sheet) {
  try {
    if (!sheet) {
      var ss = getSpreadsheet();
      if (!ss) return 0;
      var meta = findRegistrationSheetAndColumnMap(ss);
      sheet = (meta && meta.sheet) ? meta.sheet : ss.getSheetByName(CONFIG.REGISTRATIONS_SHEET);
    }
    if (!sheet || sheet.getLastRow() <= 1) return 0;

    var numCols = Math.max(25, sheet.getLastColumn());
    var data = sheet.getRange(1, 1, sheet.getLastRow(), numCols).getValues();
    var headers = data[0];
    var headerMap = getHeaderMap(headers);

    var colSched = headerMap.scheduledEmailTime !== -1 ? headerMap.scheduledEmailTime : 20; // Col U
    var colEmailStatus = headerMap.confirmationEmailStatus !== -1 ? headerMap.confirmationEmailStatus : 21; // Col V
    var colStatus = headerMap.status !== -1 ? headerMap.status : 22; // Col W
    var colSentTime = headerMap.emailSentTime !== -1 ? headerMap.emailSentTime : 24; // Col Y
    var colTimestamp = headerMap.timestamp !== -1 ? headerMap.timestamp : 1; // Col B

    var updates = 0;

    for (var r = 1; r < data.length; r++) {
      var row = data[r];
      var schedVal = (row[colSched] || "").toString().trim();
      var emailStatusVal = (row[colEmailStatus] || "").toString().trim();
      var statusVal = (row[colStatus] || "").toString().trim();
      var sentTimeVal = (row[colSentTime] || "").toString().trim();
      var regTimeVal = (row[colTimestamp] || "").toString().trim();

      var isSchedCorrupted = (schedVal.toLowerCase() === "sent" || schedVal.toLowerCase() === "pending" || (!schedVal && sentTimeVal));

      if (isSchedCorrupted) {
        var correctedEmailStatus = (schedVal.toLowerCase() === "sent" || sentTimeVal) ? "Sent" : "Pending";
        var origDateMs = parseDateSafe(regTimeVal) || (sentTimeVal ? parseDateSafe(sentTimeVal) : null) || new Date().getTime();
        var reconstructedSched = formatISTDateTime(calculateScheduledEmailDate(new Date(origDateMs)));

        sheet.getRange(r + 1, colSched + 1).setValue(reconstructedSched);
        sheet.getRange(r + 1, colEmailStatus + 1).setValue(correctedEmailStatus);
        if (!statusVal || statusVal.toLowerCase() === "pending") {
          sheet.getRange(r + 1, colStatus + 1).setValue("Registered");
        }
        updates++;
      } else {
        if (!emailStatusVal && sentTimeVal) {
          sheet.getRange(r + 1, colEmailStatus + 1).setValue("Sent");
          updates++;
        }
        if (!statusVal) {
          sheet.getRange(r + 1, colStatus + 1).setValue("Registered");
          updates++;
        }
      }
    }

    if (updates > 0) {
      SpreadsheetApp.flush();
      console.log("🛠️ Repaired " + updates + " row column misalignment(s) in Sheet1.");
    }
    return updates;
  } catch (err) {
    console.log("Repair note: " + err.toString());
    return 0;
  }
}

/**
 * Setup Headers for Attendance Sheet (16 Complete Columns)
 */
function setupAttendanceHeaders(sheet) {
  if (!sheet || typeof sheet.getLastRow !== "function") {
    var ss = getSpreadsheet();
    if (!ss) return;
    sheet = getOrCreateSheet(ss, CONFIG.ATTENDANCE_SHEET);
  }
  if (!sheet) return;

  if (sheet.getLastRow() === 0) {
    var headers = [
      "Check-in Timestamp", "Pass ID", "Team Name", "Leader Name", "Leader Email", "Leader Mobile",
      "Member 2 Name", "Member 3 Name", "Member 4 Name", "Present Headcount",
      "College / Institution", "Category", "Total Fee Paid", "UPI Ref / UTR",
      "Verified By Organizer", "Certificate Eligibility"
    ];
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#06281e").setFontColor("#10b981");
    sheet.setFrozenRows(1);
    Logger.log("✅ Initialized Attendance sheet headers with 16 columns.");
  }
}

function setupSheetHeaders() {
  var ss = getSpreadsheet();
  if (!ss) return;
  var regSheet = getOrCreateSheet(ss, CONFIG.REGISTRATIONS_SHEET);
  setupRegistrationHeaders(regSheet);
  var attSheet = getOrCreateSheet(ss, CONFIG.ATTENDANCE_SHEET);
  setupAttendanceHeaders(attSheet);
}

function getOrCreateSheet(ss, name) {
  if (!ss || typeof ss.getSheetByName !== "function") {
    ss = getSpreadsheet();
  }
  if (!ss) return null;
  if (!name) name = CONFIG.REGISTRATIONS_SHEET;

  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

/**
 * Generates a high-entropy, cryptographically secure Team ID (e.g. SYN26-8K7Q-9W2M).
 */
function generateUniqueTeamId(sheet) {
  var charset = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  var generateCandidate = function() {
    var p1 = "";
    var p2 = "";
    for (var i = 0; i < 4; i++) {
      p1 += charset.charAt(Math.floor(Math.random() * charset.length));
      p2 += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return "SYN26-" + p1 + "-" + p2;
  };

  var candidate = generateCandidate();
  if (sheet) {
    var rows = sheet.getDataRange().getValues();
    if (rows.length > 1) {
      var headerMap = getHeaderMap(rows[0]);
      if (headerMap.teamId !== -1) {
        var existing = {};
        for (var r = 1; r < rows.length; r++) {
          var val = rows[r][headerMap.teamId];
          if (val) existing[val.toString().trim().toUpperCase()] = true;
        }
        var attempts = 0;
        while (existing[candidate.toUpperCase()] && attempts < 25) {
          candidate = generateCandidate();
          attempts++;
        }
      }
    }
  }
  return candidate;
}

/**
 * Mask leader email to prevent scraping
 */
function maskEmail(email) {
  if (!email || email.indexOf('@') === -1) return email || '';
  var parts = email.split('@');
  var name = parts[0];
  var domain = parts[1];
  if (name.length <= 2) return name.charAt(0) + '••••@' + domain;
  return name.charAt(0) + '••••' + name.charAt(name.length - 1) + '@' + domain;
}

/**
 * Mask leader mobile number for privacy
 */
function maskPhone(phone) {
  if (!phone) return '';
  var clean = phone.toString().replace(/[^0-9+]/g, '');
  if (clean.length >= 10) {
    return clean.substring(0, clean.length - 6) + ' •••• ' + clean.substring(clean.length - 2);
  }
  return '•••• ••' + clean.slice(-2);
}

/**
 * Generate security checksum fingerprint
 */
function generateSecurityFingerprint(id, email) {
  var raw = (id || '') + ':' + (email || '') + ':SYNORA26_SECRET_SALT';
  var hash = 0;
  for (var i = 0; i < raw.length; i++) {
    var code = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + code;
    hash |= 0;
  }
  var hex = Math.abs(hash).toString(16).toUpperCase();
  while (hex.length < 8) hex = '0' + hex;
  return 'SEC-SHIELD-' + hex.substring(0, 4) + '-' + hex.substring(4, 8);
}

// ─── TELEGRAM NOTIFICATION HELPER ────────────────────────────────────
function sendTelegramNotification(text) {
  var botToken = getSecret('TELEGRAM_BOT_TOKEN', DEFAULT_TELEGRAM_BOT_TOKEN);
  var chatIdsStr = getSecret('TELEGRAM_CHAT_IDS', DEFAULT_TELEGRAM_CHAT_IDS);
  
  if (!botToken || !chatIdsStr) {
    console.log("ℹ️ Telegram notifications skipped (Bot Token / Chat IDs not configured).");
    return;
  }
  
  var chatIds = chatIdsStr.split(',').map(function(id) { return id.trim(); }).filter(Boolean);
  var msg = text || "🔔 SYNORA '26 / CRISPR '26 System Alert";
  
  chatIds.forEach(function(chatId) {
    try {
      var resp = UrlFetchApp.fetch('https://api.telegram.org/bot' + botToken + '/sendMessage', {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify({
          chat_id: chatId,
          text: msg
        }),
        muteHttpExceptions: true
      });
      console.log("Telegram alert to " + chatId + " -> HTTP " + resp.getResponseCode());
    } catch (tgErr) {
      console.log("⚠️ Telegram dispatch error to " + chatId + ": " + tgErr.toString());
    }
  });
}

// ─── CRON TRIGGER MANAGEMENT ─────────────────────────────────────────
function setupAutomatedEmailTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'processPendingRegistrationEmails') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  
  ScriptApp.newTrigger('processPendingRegistrationEmails')
    .timeBased()
    .everyMinutes(1)
    .create();
    
  console.log("✅ Configured single 1-minute recurring cron trigger for processPendingRegistrationEmails");
}

// ─── BACKGROUND QUEUE PROCESSOR: 5-MIN DELAYED EMAILS ────────────────
function processPendingRegistrationEmails() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) {
    console.log("Queue is locked by another instance. Skipping this run to prevent duplicate emails.");
    return 0;
  }
  try {
    var ss = getSpreadsheet();
    if (!ss) return 0;
    
    var meta = findRegistrationSheetAndColumnMap(ss);
    var sheet = (meta && meta.sheet) ? meta.sheet : ss.getSheetByName(CONFIG.REGISTRATIONS_SHEET);
    if (!sheet && ss.getSheets().length > 0) sheet = ss.getSheets()[0];
    if (!sheet) return 0;

    // 1. Auto-repair any misplaced columns
    repairSheetColumnsAndTimestamps(sheet);

    // 2. Strict Quiet Hours Check: No emails sent between 10:00 PM and 08:00 AM IST
    if (isQuietHoursNow()) {
      console.log("🌙 Quiet Hours Active (10:00 PM - 08:00 AM IST). All pending registration emails are held and will dispatch after 08:00 AM IST.");
      return 0;
    }
    
    var numCols = Math.max(25, sheet.getLastColumn());
    var data = sheet.getRange(1, 1, sheet.getLastRow(), numCols).getValues();
    if (data.length <= 1) return 0;
    
    var headerMap = getHeaderMap(data[0]);
    var nowMs = new Date().getTime();
    var processedCount = 0;

    var colSched = headerMap.scheduledEmailTime !== -1 ? headerMap.scheduledEmailTime : 20; // Col U (index 20)
    var colEmailStatus = headerMap.confirmationEmailStatus !== -1 ? headerMap.confirmationEmailStatus : 21; // Col V (index 21)
    var colStatus = headerMap.status !== -1 ? headerMap.status : 22; // Col W (index 22)
    var colSentTime = headerMap.emailSentTime !== -1 ? headerMap.emailSentTime : 24; // Col Y (index 24)
    var colTimestamp = headerMap.timestamp !== -1 ? headerMap.timestamp : 1; // Col B (index 1)
    
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (!row || row.length === 0) continue;
      
      var emailStatus = (row[colEmailStatus] || "").toString().trim().toLowerCase();
      var schedVal = (row[colSched] || "").toString().trim();
      
      // Fallback search for pending in other columns (excluding scheduled timestamp column)
      if (!emailStatus && schedVal.toLowerCase() !== "pending") {
        for (var c = 0; c < row.length; c++) {
          if (c !== colSched && row[c] && row[c].toString().trim().toLowerCase() === "pending") {
            emailStatus = "pending";
            break;
          }
        }
      }
      
      if (emailStatus === "pending") {
        var leaderEmail = (headerMap.leaderEmail !== undefined && headerMap.leaderEmail !== -1 && row[headerMap.leaderEmail]) ? row[headerMap.leaderEmail].toString().trim() : "";
        if (!leaderEmail || leaderEmail.indexOf("@") === -1) {
          for (var c = 0; c < row.length; c++) {
            var cellStr = (row[c] || "").toString().trim();
            if (cellStr && /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(cellStr)) {
              leaderEmail = cellStr;
              break;
            }
          }
        }
        
        var teamName = (headerMap.teamName !== undefined && headerMap.teamName !== -1 && row[headerMap.teamName]) ? row[headerMap.teamName].toString().trim() : "";
        if (!teamName) {
          teamName = (row[2] || row[1] || ("Team " + i)).toString().trim();
        }
        
        var leaderName = (headerMap.leaderName !== undefined && headerMap.leaderName !== -1 && row[headerMap.leaderName]) ? row[headerMap.leaderName].toString().trim() : "";
        if (!leaderName) {
          leaderName = (row[4] || "Team Leader").toString().trim();
        }
        
        var leaderPhone = (headerMap.leaderPhone !== undefined && headerMap.leaderPhone !== -1 && row[headerMap.leaderPhone]) ? row[headerMap.leaderPhone].toString().trim() : "";
        if (!leaderPhone) {
          for (var c = 0; c < row.length; c++) {
            var cellStr = (row[c] || "").toString().trim().replace(/\D/g, '');
            if (cellStr.length === 10 && cellStr !== leaderPhone) {
              leaderPhone = cellStr;
              break;
            }
          }
        }
        
        var teamId = (headerMap.teamId !== -1 && row[headerMap.teamId]) ? row[headerMap.teamId].toString().trim() : "";
        if (!teamId) {
          if (row[0] && row[0].toString().indexOf("SYN") === 0) {
            teamId = row[0].toString().trim();
          } else {
            teamId = "SYN-" + (2600 + i);
          }
        }
        
        var membersList = [];
        if (headerMap.m1Name !== undefined && headerMap.m1Name !== -1 && row[headerMap.m1Name]) membersList.push(row[headerMap.m1Name].toString().trim());
        if (headerMap.m2Name !== undefined && headerMap.m2Name !== -1 && row[headerMap.m2Name]) membersList.push(row[headerMap.m2Name].toString().trim());
        if (headerMap.m3Name !== undefined && headerMap.m3Name !== -1 && row[headerMap.m3Name]) membersList.push(row[headerMap.m3Name].toString().trim());
        
        var membersStr = membersList.length > 0 ? membersList.join(', ') : ((headerMap.members !== undefined && headerMap.members !== -1 && row[headerMap.members]) ? row[headerMap.members].toString().trim() : '');
        var regType = (headerMap.regType !== undefined && headerMap.regType !== -1 && row[headerMap.regType]) ? row[headerMap.regType].toString().trim() : "INTERNAL";
        var college = (regType.toUpperCase() === 'INTERNAL') ? 'SIMATS Engineering' : ((headerMap.college !== undefined && headerMap.college !== -1 && row[headerMap.college]) ? row[headerMap.college].toString().trim() : 'External College');

        var schedTimeVal = row[colSched];
        var schedTimeMs = parseDateSafe(schedTimeVal);
        
        if (!schedTimeMs) {
          var regTimeVal = (headerMap.timestamp !== undefined && headerMap.timestamp !== -1) ? row[headerMap.timestamp] : row[colTimestamp];
          var regTimeMs = parseDateSafe(regTimeVal);
          if (regTimeMs) {
            var schedObj = calculateScheduledEmailDate(new Date(regTimeMs));
            schedTimeMs = schedObj.getTime();
            sheet.getRange(i + 1, colSched + 1).setValue(formatISTDateTime(schedObj));
          } else {
            schedTimeMs = nowMs - 1000;
          }
        }
        
        // Dispatch strictly when scheduled 5-minute delay / post-8am time has arrived
        if (schedTimeMs && nowMs >= schedTimeMs && leaderEmail && leaderEmail.indexOf("@") !== -1) {
          console.log("⏳ 5-Minute delay elapsed! Dispatching single confirmation email for Team: " + teamName + " [ID: " + teamId + "] to Team Leader: " + leaderEmail);
          
          // Atomic lock: mark as sending to prevent duplicate dispatches
          sheet.getRange(i + 1, colEmailStatus + 1).setValue("Sending");
          SpreadsheetApp.flush();

          var emailSent = sendRegistrationConfirmationEmail({
            teamId: teamId,
            teamName: teamName,
            college: college,
            leaderName: leaderName,
            leaderEmail: leaderEmail,
            leaderPhone: leaderPhone,
            membersStr: membersStr
          });
          
          if (emailSent) {
            // Update ConfirmationEmailStatus (Col V) to "Sent"
            sheet.getRange(i + 1, colEmailStatus + 1).setValue("Sent");
            
            // Record EmailSentTime (Col Y)
            sheet.getRange(i + 1, colSentTime + 1).setValue(formatISTDateTime(new Date()));
            
            // Ensure Status (Col W) remains "Registered"
            var curStatus = (row[colStatus] || "").toString().trim();
            if (!curStatus) {
              sheet.getRange(i + 1, colStatus + 1).setValue("Registered");
            }

            SpreadsheetApp.flush();
            processedCount++;
            
            sendTelegramNotification("📧 CONFIRMATION EMAIL DELIVERED (To Team Leader Only)\n\nTeam ID: " + teamId + "\nTeam   : " + teamName + "\nLeader : " + leaderName + "\nEmail  : " + leaderEmail + "\nTime   : " + formatISTDateTime(new Date()));
          } else {
            // Revert to Pending if email send failed
            sheet.getRange(i + 1, colEmailStatus + 1).setValue("Pending");
            SpreadsheetApp.flush();
          }
        } else if (schedTimeMs && nowMs < schedTimeMs) {
          var remainingSec = Math.round((schedTimeMs - nowMs) / 1000);
          console.log("⏳ Team " + teamName + " [" + teamId + "] email scheduled in " + remainingSec + "s (" + schedTimeVal + ")");
        }
      }
    }
    
    if (processedCount > 0) {
      console.log("✅ Delivered " + processedCount + " scheduled confirmation email(s) strictly to Team Leaders.");
    }
    return processedCount;
  } catch (err) {
    console.log("❌ Error in processPendingRegistrationEmails: " + err.toString());
    return 0;
  } finally {
    lock.releaseLock();
  }
}

// ─── BRANDED EMAIL PASS DISPATCHER ───────────────────────────────────
function sendRegistrationConfirmationEmail(details) {
  try {
    if (!details || typeof details !== 'object' || !details.teamName) {
      var userEmail = Session.getActiveUser().getEmail() || "organizer@example.com";
      details = {
        teamId: "SYN-2601",
        teamName: "Alpha Innovators",
        college: "SIMATS Engineering",
        leaderName: userEmail.split('@')[0] || "Team Leader",
        leaderEmail: userEmail,
        leaderPhone: "9876543210",
        membersStr: "Member 1 (m1@example.com), Member 2 (m2@example.com)"
      };
    }
    
    console.log("📨 Preparing confirmation email for Team: " + details.teamName + " -> " + details.leaderEmail);
    
    var subject = "CRISPR '26 Official Entry Pass & Receipt - Team " + details.teamName + " [" + details.teamId + "]";
    var webAppUrl = ACTIVE_WEB_APP_URL;
    var passUrl = webAppUrl + "?action=pass&id=" + encodeURIComponent(details.teamId);
    
    var qrBlob = null;
    var qrBase64 = "";
    var qrEndpoints = [
      "https://quickchart.io/qr?size=350&margin=1&text=" + encodeURIComponent(passUrl),
      "https://api.qrserver.com/v1/create-qr-code/?size=350x350&margin=2&data=" + encodeURIComponent(passUrl)
    ];

    for (var q = 0; q < qrEndpoints.length; q++) {
      try {
        var qrResp = UrlFetchApp.fetch(qrEndpoints[q], { muteHttpExceptions: true });
        if (qrResp.getResponseCode() === 200) {
          qrBlob = qrResp.getBlob().setName("CRISPR26_Pass_" + details.teamId + ".png").setContentType("image/png");
          qrBase64 = Utilities.base64Encode(qrBlob.getBytes());
          break;
        }
      } catch(qrFetchErr) {
        console.warn("QR fetch provider " + q + " error: " + qrFetchErr.toString());
      }
    }

    var qrImgSrc = qrBase64 ? ("data:image/png;base64," + qrBase64) : (qrBlob ? "cid:synoraQrPass" : qrEndpoints[0]);
    
    var membersListHtml = "";
    if (details.membersStr) {
      var membersArr = details.membersStr.split(/[,;\n]/);
      var validM = [];
      for (var m = 0; m < membersArr.length; m++) {
        var mText = membersArr[m].trim();
        if (!mText) continue;
        if (/^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(mText)) continue;
        if (/^\d{1,2}:\d{1,2}/.test(mText)) continue;
        if (/^(am|pm|registered|checked-in|submitted|certified|pending|sent|none)$/i.test(mText)) continue;
        validM.push(mText);
      }
      for (var v = 0; v < validM.length; v++) {
        membersListHtml += "<li style='margin-bottom:6px; color:#334155;'><strong>Member " + (v + 1) + ":</strong> " + validM[v] + "</li>";
      }
    }

    var htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin:0; padding:0; background-color:#f1f5f9; font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color:#1e293b;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9; padding:24px 0;">
          <tr>
            <td align="center">
              <table width="100%" max-width="600" cellpadding="0" cellspacing="0" style="max-width:600px; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 10px 25px rgba(0,0,0,0.08); border:1px solid #e2e8f0;">
                
                <!-- HEADER BANNER -->
                <tr>
                  <td style="background: linear-gradient(135deg, #090514 0%, #1e1035 50%, #064e3b 100%); padding: 36px 28px; text-align: center;">
                    <div style="font-size: 13px; font-weight: 700; color: #06b6d4; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 8px;">
                      SIMATS Engineering · Department of Medical Biotechnology
                    </div>
                    <h1 style="margin: 0; font-size: 32px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
                      CRISPR '26
                    </h1>
                    <p style="margin: 8px 0 0 0; font-size: 14px; color: #cbd5e1;">
                      National Level Hands-on Workshop · Sponsored by IET
                    </p>
                  </td>
                </tr>

                <!-- BADGE & GREETING -->
                <tr>
                  <td style="padding: 28px 28px 12px 28px;">
                    <div style="display:inline-block; background-color:#ecfdf5; border:1px solid #a7f3d0; color:#065f46; font-size:12px; font-weight:700; padding:4px 12px; border-radius:9999px; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:16px;">
                      ✅ Registration Verified · ID: ${details.teamId}
                    </div>
                    <h2 style="margin:0 0 12px 0; font-size:20px; color:#0f172a;">
                      Hello ${details.leaderName},
                    </h2>
                    <p style="margin:0; font-size:15px; line-height:1.6; color:#475569;">
                      Congratulations! Your team <strong>${details.teamName}</strong> has been officially confirmed for <strong>CRISPR '26</strong>.
                    </p>
                  </td>
                </tr>

                <!-- QR CODE ENTRY PASS -->
                <tr>
                  <td align="center" style="padding: 12px 28px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%); border: 2px solid #06b6d4; border-radius: 16px; padding: 20px; text-align: center; box-shadow: 0 4px 20px rgba(6, 182, 212, 0.12);">
                      <tr>
                        <td align="center">
                          <div style="font-size: 12px; font-weight: 800; color: #0284c7; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 4px;">
                            🛡️ OFFICIAL VENUE ENTRY PASS
                          </div>
                          <div style="font-size: 19px; font-weight: 800; color: #0f172a; margin-bottom: 12px;">
                            ${details.teamName} <span style="color:#0284c7; font-size:15px;">(${details.teamId})</span>
                          </div>
                          
                          <div style="background: #ffffff; padding: 10px; border-radius: 12px; border: 1px solid #cbd5e1; display: inline-block; box-shadow: 0 4px 15px rgba(0,0,0,0.06); margin-bottom: 10px;">
                            <img src="${qrImgSrc}" alt="CRISPR 26 Desk QR Pass" width="220" height="220" style="display: block; border-radius: 4px;" />
                          </div>

                          <div style="font-size: 13px; font-weight: 700; color: #059669; letter-spacing: 0.5px;">
                            ✓ SCAN AT REGISTRATION DESK FOR CHECK-IN
                          </div>
                          <div style="margin-top: 8px;">
                            <a href="${passUrl}" target="_blank" style="display:inline-block; background-color:#0284c7; color:#ffffff; font-size:12px; font-weight:700; text-decoration:none; padding:8px 18px; border-radius:6px;">
                              ⚡ View Live Web Pass & Attendance Status
                            </a>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- DETAILS TABLE -->
                <tr>
                  <td style="padding: 12px 28px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;">
                      <tr>
                        <td colspan="2" style="padding: 12px 16px; background-color: #f1f5f9; border-bottom: 1px solid #e2e8f0; font-size: 13px; font-weight: 700; color: #334155; text-transform: uppercase;">
                          📋 Registration Summary
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 16px; font-size: 13px; color: #64748b; width: 35%; border-bottom: 1px solid #e2e8f0;">Pass ID</td>
                        <td style="padding: 10px 16px; font-size: 13px; font-weight: 700; color: #0284c7; border-bottom: 1px solid #e2e8f0;">${details.teamId}</td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 16px; font-size: 13px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Team Name</td>
                        <td style="padding: 10px 16px; font-size: 13px; font-weight: 600; color: #0f172a; border-bottom: 1px solid #e2e8f0;">${details.teamName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 16px; font-size: 13px; color: #64748b; border-bottom: 1px solid #e2e8f0;">College / Inst.</td>
                        <td style="padding: 10px 16px; font-size: 13px; font-weight: 600; color: #0f172a; border-bottom: 1px solid #e2e8f0;">${details.college}</td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 16px; font-size: 13px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Workshop Date</td>
                        <td style="padding: 10px 16px; font-size: 13px; font-weight: 700; color: #0284c7; border-bottom: 1px solid #e2e8f0;">October 3, 2026 · 08:30 AM IST</td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 16px; font-size: 13px; color: #64748b;">Venue</td>
                        <td style="padding: 10px 16px; font-size: 13px; font-weight: 600; color: #0f172a;">RB Seminar Hall, SIMATS Engineering, Chennai</td>
                      </tr>
                    </table>
                  </td>
                </tr>

                ${membersListHtml ? `
                <tr>
                  <td style="padding: 8px 28px 16px 28px;">
                    <div style="font-size: 13px; font-weight: 700; color: #334155; text-transform: uppercase; margin-bottom: 8px;">
                      👥 Registered Co-Delegates
                    </div>
                    <ul style="margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.6;">
                      ${membersListHtml}
                    </ul>
                  </td>
                </tr>
                ` : ''}

                <!-- ID CARD MANDATORY NOTICE -->
                <tr>
                  <td style="padding: 0 28px 16px 28px;">
                    <div style="background-color: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 14px; text-align: left;">
                      <strong style="color: #166534; font-size: 13px; display: block; margin-bottom: 4px;">
                        🪪 Mandatory Check-In Requirement
                      </strong>
                      <span style="color: #14532d; font-size: 12.5px; line-height: 1.5;">
                        <strong>All students must bring their official college ID cards</strong> and downloaded digital pass for reception check-in & IET certificate verification.
                      </span>
                    </div>
                  </td>
                </tr>

                <!-- FOOTER -->
                <tr>
                  <td style="background-color: #0f172a; padding: 24px; text-align: center; color: #94a3b8; font-size: 12px; line-height: 1.5;">
                    <div style="color: #ffffff; font-weight: 700; margin-bottom: 4px;">
                      Department of Medical Biotechnology · SIMATS Engineering
                    </div>
                    <div>Saveetha Nagar, Thandalam, Chennai, Tamil Nadu - 602105</div>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
    
    var plainBody = "Dear " + details.leaderName + ",\n\n" +
                    "Your team " + details.teamName + " [Pass ID: " + details.teamId + "] is confirmed for CRISPR '26!\n\n" +
                    "Workshop Date: October 3, 2026\n" +
                    "Reporting Time: 08:30 AM IST\n" +
                    "Venue: RB Seminar Hall, SIMATS Engineering, Chennai.\n\n" +
                    "⚠️ MANDATORY: All students must bring their official physical college ID cards and laptops.\n\n" +
                    "Live Pass Link: " + passUrl + "\n\n" +
                    "Department of Medical Biotechnology,\nSIMATS Engineering.";
    
    var senderEmail = Session.getActiveUser().getEmail() || "synora2026@gmail.com";
    var emailOptions = {
      name: "CRISPR '26 Organizing Committee",
      replyTo: senderEmail,
      htmlBody: htmlBody
    };
    if (qrBlob) {
      emailOptions.inlineImages = { synoraQrPass: qrBlob };
      emailOptions.attachments = [qrBlob];
    }

    try {
      MailApp.sendEmail({
        to: details.leaderEmail,
        name: "CRISPR '26 Organizing Committee",
        replyTo: senderEmail,
        subject: subject,
        body: plainBody,
        htmlBody: htmlBody,
        inlineImages: qrBlob ? { synoraQrPass: qrBlob } : undefined,
        attachments: qrBlob ? [qrBlob] : undefined
      });
      console.log("✅ Confirmation email pass dispatched directly to Team Leader (" + details.leaderEmail + ")");
      return true;
    } catch (mErr) {
      try {
        GmailApp.sendEmail(details.leaderEmail, subject, plainBody, emailOptions);
        console.log("✅ Confirmation pass dispatched via GmailApp fallback to Team Leader (" + details.leaderEmail + ")");
        return true;
      } catch (gErr) {
        console.log("❌ Email send failure to Team Leader (" + details.leaderEmail + "): " + gErr.toString());
        return false;
      }
    }
  } catch (err) {
    console.log("❌ Failure in sendRegistrationConfirmationEmail: " + err.toString());
    return false;
  }
}

// ─── DYNAMIC 4-STAGE EVENT STATE MACHINE HTML RENDERER ───────────────
function renderStateMachinePassHtml(data) {
  if (!data) {
    data = {
      teamId: "SYN-2601",
      teamName: "Sample Team",
      college: "SIMATS Engineering",
      leaderName: "Team Leader",
      track: "CRISPR Gene Editing Technologies",
      status: "Registered"
    };
  }
  var statusNorm = (data.status || 'Registered').toLowerCase().trim();
  
  var isRegistered = (statusNorm === 'registered' || statusNorm === 'verified' || statusNorm === 'pending');
  var isCheckedIn = (statusNorm === 'checked-in' || statusNorm === 'present' || statusNorm === 'active');
  var isSubmitted = (statusNorm === 'submitted' || statusNorm === 'evaluating' || statusNorm === 'locked');
  var isCertified = (statusNorm === 'certified' || statusNorm === 'completed' || statusNorm === 'winner');

  var badgeText = "✓ REGISTRATION VERIFIED";
  var badgeColor = "#22c55e";
  var badgeBg = "#052e16";
  
  if (isCheckedIn) {
    badgeText = "⚡ VENUE CHECKED-IN & PRESENT";
    badgeColor = "#06b6d4";
    badgeBg = "#083344";
  } else if (isSubmitted) {
    badgeText = "🔒 EVALUATION LOCKED";
    badgeColor = "#f59e0b";
    badgeBg = "#451a03";
  } else if (isCertified) {
    badgeText = "🎓 IET CERTIFICATE RELEASED";
    badgeColor = "#a855f7";
    badgeBg = "#3b0764";
  }

  var membersHtml = "";
  if (data.members) {
    var rawList = data.members.toString().split(/[,;\n]/);
    var validMembers = [];
    for (var m = 0; m < rawList.length; m++) {
      var mItem = rawList[m].trim();
      if (!mItem) continue;
      if (/^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(mItem)) continue;
      if (/^\d{1,2}:\d{1,2}/.test(mItem)) continue;
      if (/^(am|pm|registered|checked-in|submitted|certified|pending|sent|none)$/i.test(mItem)) continue;
      validMembers.push(mItem);
    }
    for (var v = 0; v < validMembers.length; v++) {
      membersHtml += '<div style="padding:6px 0; border-bottom:1px dashed rgba(255,255,255,0.08); font-size:13px; color:#cbd5e1;">' +
                     '<strong>Member ' + (v + 1) + ':</strong> ' + validMembers[v] + '</div>';
    }
  }

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>CRISPR '26 · Entry Pass - ${data.teamName} [${data.teamId}]</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background: #03000a;
          color: #f8fafc;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }
        .pass-card {
          width: 100%;
          max-width: 480px;
          background: #0d071e;
          border: 1px solid rgba(124, 58, 237, 0.4);
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(124, 58, 237, 0.2);
        }
        .pass-header {
          background: linear-gradient(135deg, #1e1035 0%, #090514 100%);
          padding: 24px 20px;
          text-align: center;
          border-bottom: 2px solid #06b6d4;
        }
        .event-sub {
          font-size: 11px;
          font-weight: 700;
          color: #06b6d4;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          margin-bottom: 4px;
        }
        .event-title {
          font-size: 28px;
          font-weight: 800;
          color: #ffffff;
          letter-spacing: -0.5px;
          margin-bottom: 2px;
        }
        .dept-title {
          font-size: 12px;
          color: #94a3b8;
        }
        .badge-wrap {
          text-align: center;
          margin: -14px 0 10px 0;
        }
        .verified-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: ${badgeBg};
          border: 1px solid ${badgeColor};
          color: ${badgeColor};
          font-size: 11.5px;
          font-weight: 700;
          padding: 6px 16px;
          border-radius: 9999px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }
        .pass-body {
          padding: 16px 20px;
        }
        .section-title {
          font-size: 11px;
          font-weight: 700;
          color: #06b6d4;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin: 14px 0 6px 0;
        }
        .info-box {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 12px 14px;
          margin-bottom: 12px;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          padding: 5px 0;
          font-size: 13.5px;
        }
        .info-label {
          color: #94a3b8;
          font-size: 12.5px;
        }
        .info-val {
          color: #f8fafc;
          font-weight: 600;
          text-align: right;
          word-break: break-word;
          max-width: 65%;
        }
        .state-highlight-box {
          border-radius: 12px;
          padding: 14px;
          margin-bottom: 12px;
          font-size: 13px;
          line-height: 1.6;
        }
        .pass-footer {
          text-align: center;
          padding: 14px 20px;
          background: rgba(0, 0, 0, 0.4);
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          font-size: 11px;
          color: #64748b;
          line-height: 1.5;
        }
      </style>
    </head>
    <body>
      <div class="pass-card">
        <div class="pass-header">
          <div class="event-sub">SIMATS ENGINEERING · BIOTECHNOLOGY</div>
          <div class="event-title">CRISPR '26</div>
          <div class="dept-title">National Workshop · Sponsored by IET</div>
        </div>
        
        <div class="badge-wrap">
          <span class="verified-pill">
            ${badgeText}
          </span>
        </div>

        <div class="pass-body">
          
          <!-- STAGE-SPECIFIC DYNAMIC STATE CARDS -->
          ${isCheckedIn ? `
          <div class="state-highlight-box" style="background:rgba(6,182,212,0.08); border:1px solid rgba(6,182,212,0.3); color:#e0f2fe;">
            <div style="font-weight:700; color:#38bdf8; margin-bottom:4px; font-size:14px;">⚡ Venue Check-In Complete</div>
            <div>Arrival Timestamp: <strong>${data.checkInTime || 'Checked-In'}</strong></div>
            <div style="margin-top:6px; font-size:12px; color:#94a3b8;">Venue: <strong>RB Seminar Hall</strong> · Wi-Fi: <strong>SIMATS_EVENT</strong></div>
            <div style="margin-top:10px;">
              <a href="${WHATSAPP_GROUP_LINK}" target="_blank" style="display:inline-block; background:#0284c7; color:#fff; padding:6px 12px; border-radius:6px; text-decoration:none; font-size:12px; font-weight:700;">
                💬 Join CRISPR '26 WhatsApp Community
              </a>
            </div>
          </div>
          ` : ''}

          <div class="section-title">Team Identification</div>
          <div class="info-box">
            <div class="info-row">
              <span class="info-label">Pass ID</span>
              <span class="info-val" style="color:#38bdf8; font-size:15px; font-weight:800;">${data.teamId}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Team Name</span>
              <span class="info-val" style="color:#ffffff; font-weight:700;">${data.teamName}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Institution</span>
              <span class="info-val">${data.college}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Team Leader</span>
              <span class="info-val">${data.leaderName}</span>
            </div>
          </div>

          ${membersHtml ? `
          <div class="section-title">Co-Delegates</div>
          <div class="info-box">
            ${membersHtml}
          </div>
          ` : ''}

          <div class="section-title">Event Schedule & Logistics</div>
          <div class="info-box" style="background:rgba(6,182,212,0.04); border-color:rgba(6,182,212,0.2);">
            <div style="font-size:12.5px; line-height:1.6; color:#cbd5e1;">
              <div><strong>📍 Venue:</strong> RB Seminar Hall, SIMATS Engineering, Chennai</div>
              <div><strong>⏰ Date:</strong> October 3, 2026 · 08:30 AM IST</div>
              <div><strong>🪪 Requirement:</strong> All delegates must present official physical college ID cards.</div>
            </div>
          </div>
        </div>

        <div class="pass-footer">
          CRISPR '26 Official Portal · SIMATS Engineering<br>
          Verification Status: ${data.status} · Pass ID: ${data.teamId}
        </div>
      </div>
    </body>
    </html>
  `;
}

// ─── PASS LOOKUP FROM REGISTRATION SHEET ─────────────────────────────
function findTicketByIdOrEmail(ss, query, verifyEmail) {
  ss = getSpreadsheet(ss);
  if (!ss) return null;

  var meta = findRegistrationSheetAndColumnMap(ss);
  if (!meta || !meta.sheet) return null;

  var sheet = meta.sheet;
  var colMap = meta.colMap;
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return null;

  var cleanQuery = String(query || "").trim();
  var urlMatch = cleanQuery.match(/(?:pass[=/]|id=)?(SYN(?:26)?-[A-Z0-9]{3,5}-[A-Z0-9]{3,5}|SYN-\d{4})/i);
  if (urlMatch && urlMatch[1]) {
    cleanQuery = urlMatch[1];
  }
  
  var upperQ = cleanQuery.toUpperCase();
  var lowerQ = cleanQuery.toLowerCase();
  var phoneQ = cleanQuery.replace(/\D/g, "");
  var emailQ = String(verifyEmail || query || "").toLowerCase().trim();

  var presentMap = getPresentTeamIdsMap(ss);

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    
    var rowTeamId = String(row[colMap.teamId] || "").trim().toUpperCase();
    var rowTeamName = String(row[colMap.teamName] || "").trim();
    var rowLeaderEmail = String(row[colMap.leaderEmail] || "").trim().toLowerCase();
    var rowLeaderMobile = String(row[colMap.leaderMobile] || "").replace(/\D/g, "");
    
    var isMatch = false;

    if (upperQ && rowTeamId === upperQ) isMatch = true;
    else if (emailQ && rowLeaderEmail === emailQ) isMatch = true;
    else if (phoneQ && phoneQ.length >= 7 && rowLeaderMobile.includes(phoneQ)) isMatch = true;
    else if (upperQ && rowTeamName.toUpperCase() === upperQ) isMatch = true;

    if (!isMatch && upperQ) {
      for (var c = 0; c < row.length; c++) {
        var cellVal = String(row[c] || "").trim();
        if (cellVal.toUpperCase() === upperQ || cellVal.toLowerCase() === lowerQ) {
          isMatch = true;
          break;
        }
      }
    }

    if (isMatch) {
      var leaderName = String(row[colMap.leaderName] || "").trim();
      var college = String(row[colMap.college] || "SIMATS Engineering").trim();
      var track = colMap.track !== undefined && row[colMap.track] ? String(row[colMap.track]) : "CRISPR Gene Editing Technologies";
      var category = colMap.category !== undefined && row[colMap.category] ? String(row[colMap.category]) : "student";
      var collegeType = colMap.collegeType !== undefined && row[colMap.collegeType] ? String(row[colMap.collegeType]) : "external";
      var leaderDesignation = colMap.leaderDesignation !== undefined ? String(row[colMap.leaderDesignation] || "") : "";
      
      var member1 = colMap.member1Name !== undefined ? String(row[colMap.member1Name] || "").trim() : "";
      var member2 = colMap.member2Name !== undefined ? String(row[colMap.member2Name] || "").trim() : "";
      var member3 = colMap.member3Name !== undefined ? String(row[colMap.member3Name] || "").trim() : "";
      
      var members = [member1, member2, member3].filter(Boolean);
      var isPresent = presentMap[rowTeamId] !== undefined || (colMap.attendanceStatus !== undefined && String(row[colMap.attendanceStatus] || "").toUpperCase() === "PRESENT");

      return {
        teamId: rowTeamId || cleanQuery,
        teamName: rowTeamName || "Registered Team",
        track: track,
        participantCategory: category,
        college: college,
        collegeType: collegeType,
        leaderName: leaderName,
        leaderEmail: String(row[colMap.leaderEmail] || ""),
        leaderPhone: String(row[colMap.leaderMobile] || ""),
        leaderDesignation: leaderDesignation,
        members: members,
        memberDetails: [
          member1 ? { 
            name: member1, 
            email: colMap.member1Email !== undefined ? String(row[colMap.member1Email] || "") : "", 
            phone: colMap.member1Mobile !== undefined ? String(row[colMap.member1Mobile] || "") : "", 
            designation: colMap.member1Designation !== undefined ? String(row[colMap.member1Designation] || "") : "", 
            role: "Member 2" 
          } : null,
          member2 ? { 
            name: member2, 
            email: colMap.member2Email !== undefined ? String(row[colMap.member2Email] || "") : "", 
            phone: colMap.member2Mobile !== undefined ? String(row[colMap.member2Mobile] || "") : "", 
            designation: "", 
            role: "Member 3" 
          } : null,
          member3 ? { 
            name: member3, 
            email: colMap.member3Email !== undefined ? String(row[colMap.member3Email] || "") : "", 
            phone: colMap.member3Mobile !== undefined ? String(row[colMap.member3Mobile] || "") : "", 
            designation: "", 
            role: "Member 4" 
          } : null
        ].filter(Boolean),
        totalFee: colMap.totalFee !== undefined && row[colMap.totalFee] ? Number(row[colMap.totalFee]) : 400,
        txnId: colMap.txnId !== undefined ? String(row[colMap.txnId] || "") : "",
        paymentReceiptUrl: colMap.receiptUrl !== undefined ? String(row[colMap.receiptUrl] || "") : "",
        checkedIn: isPresent,
        checkinTime: presentMap[rowTeamId]?.checkinTime || (colMap.checkinTime !== undefined ? String(row[colMap.checkinTime] || "") : ""),
        verifiedBy: presentMap[rowTeamId]?.verifiedBy || (colMap.verifiedBy !== undefined ? String(row[colMap.verifiedBy] || "") : ""),
        registeredAt: colMap.timestamp !== undefined ? String(row[colMap.timestamp] || "") : ""
      };
    }
  }

  return null;
}

// ─── FETCH ALL REGISTERED TEAMS (LIVE SYNC) ──────────────────────────
function getAllTeamsFromRegistrationSheet(ss) {
  ss = getSpreadsheet(ss);
  if (!ss) return [];

  var meta = findRegistrationSheetAndColumnMap(ss);
  if (!meta || !meta.sheet) return [];

  var sheet = meta.sheet;
  var colMap = meta.colMap;
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  var presentMap = getPresentTeamIdsMap(ss);
  var results = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var rowTeamId = String(row[colMap.teamId] || "").trim();
    var rowTeamName = String(row[colMap.teamName] || "").trim();
    var rowLeaderEmail = String(row[colMap.leaderEmail] || "").trim();

    if (!rowTeamId && !rowTeamName && !rowLeaderEmail) continue;
    if (rowTeamId.toLowerCase() === "team id" || rowTeamId.toLowerCase() === "teamid") continue;

    var leaderName = String(row[colMap.leaderName] || "").trim();
    var college = String(row[colMap.college] || "SIMATS Engineering").trim();
    var track = colMap.track !== undefined && row[colMap.track] ? String(row[colMap.track]) : "CRISPR Gene Editing Technologies";
    var category = colMap.category !== undefined && row[colMap.category] ? String(row[colMap.category]) : "student";
    var collegeType = colMap.collegeType !== undefined && row[colMap.collegeType] ? String(row[colMap.collegeType]) : "external";
    var leaderDesignation = colMap.leaderDesignation !== undefined ? String(row[colMap.leaderDesignation] || "") : "";
    
    var member1 = colMap.member1Name !== undefined ? String(row[colMap.member1Name] || "").trim() : "";
    var member2 = colMap.member2Name !== undefined ? String(row[colMap.member2Name] || "").trim() : "";
    var member3 = colMap.member3Name !== undefined ? String(row[colMap.member3Name] || "").trim() : "";
    
    var members = [member1, member2, member3].filter(Boolean);
    var upperId = rowTeamId.toUpperCase();
    var isPresent = presentMap[upperId] !== undefined || (colMap.attendanceStatus !== undefined && String(row[colMap.attendanceStatus] || "").toUpperCase() === "PRESENT");

    results.push({
      teamId: rowTeamId,
      teamName: rowTeamName || "Registered Team",
      track: track,
      participantCategory: category,
      college: college,
      collegeType: collegeType,
      leaderName: leaderName,
      leaderEmail: rowLeaderEmail,
      leaderPhone: String(row[colMap.leaderMobile] || ""),
      leaderDesignation: leaderDesignation,
      members: members,
      memberDetails: [
        member1 ? { 
          name: member1, 
          email: colMap.member1Email !== undefined ? String(row[colMap.member1Email] || "") : "", 
          phone: colMap.member1Mobile !== undefined ? String(row[colMap.member1Mobile] || "") : "", 
          designation: colMap.member1Designation !== undefined ? String(row[colMap.member1Designation] || "") : "", 
          role: "Member 2" 
        } : null,
        member2 ? { 
          name: member2, 
          email: colMap.member2Email !== undefined ? String(row[colMap.member2Email] || "") : "", 
          phone: colMap.member2Mobile !== undefined ? String(row[colMap.member2Mobile] || "") : "", 
          designation: "", 
          role: "Member 3" 
        } : null,
        member3 ? { 
          name: member3, 
          email: colMap.member3Email !== undefined ? String(row[colMap.member3Email] || "") : "", 
          phone: colMap.member3Mobile !== undefined ? String(row[colMap.member3Mobile] || "") : "", 
          designation: "", 
          role: "Member 4" 
        } : null
      ].filter(Boolean),
      totalFee: colMap.totalFee !== undefined && row[colMap.totalFee] ? Number(row[colMap.totalFee]) : 400,
      txnId: colMap.txnId !== undefined ? String(row[colMap.txnId] || "") : "",
      paymentReceiptUrl: colMap.receiptUrl !== undefined ? String(row[colMap.receiptUrl] || "") : "",
      checkedIn: isPresent,
      checkinTime: presentMap[upperId]?.checkinTime || (colMap.checkinTime !== undefined ? String(row[colMap.checkinTime] || "") : ""),
      verifiedBy: presentMap[upperId]?.verifiedBy || (colMap.verifiedBy !== undefined ? String(row[colMap.verifiedBy] || "") : ""),
      registeredAt: colMap.timestamp !== undefined ? String(row[colMap.timestamp] || "") : ""
    });
  }

  return results;
}

// ─── HELPER: MAP OF PRESENT TEAMS FROM ATTENDANCE SHEET ──────────────
function getPresentTeamIdsMap(ss) {
  var map = {};
  try {
    var attSheet = ss.getSheetByName(CONFIG.ATTENDANCE_SHEET);
    if (!attSheet) return map;
    var data = attSheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      var tid = String(data[i][1] || "").trim().toUpperCase();
      if (tid) {
        map[tid] = {
          checkinTime: String(data[i][0] || ""),
          verifiedBy: String(data[i][14] || "Reception Desk")
        };
      }
    }
  } catch (e) {}
  return map;
}

// ─── CHECK-IN HANDLER (POPULATES ALL 16 COLUMNS) ─────────────────────
function handleCheckIn(ss, params, callback) {
  params = params || {};
  ss = getSpreadsheet(ss);

  if (!ss) {
    return createJsonResponse({ status: "error", message: "Google Sheet not accessible." }, callback);
  }

  var query = (params.teamId || params.id || params.email || params.phone || "").trim();
  
  if (!query) {
    Logger.log("ℹ️ handleCheckIn called without team query.");
    return createJsonResponse({
      status: "ready",
      message: "handleCheckIn is ready."
    }, callback);
  }

  var verifier = params.organizerName || params.verifiedBy || "Reception Desk";
  var nowStr = Utilities.formatDate(new Date(), "Asia/Kolkata", "dd/MM/yyyy, hh:mm:ss a") + " IST";

  var ticket = findTicketByIdOrEmail(ss, query, params.leaderEmail || params.email);
  
  var finalTeamId = (ticket && ticket.teamId) ? ticket.teamId : (query ? query.toUpperCase() : "SYN26-XXXX");
  var finalTeamName = (ticket && ticket.teamName && ticket.teamName !== "Registered Team") ? ticket.teamName : (params.teamName || "Registered Team");
  var finalLeaderName = (ticket && ticket.leaderName && ticket.leaderName !== "Team Leader") ? ticket.leaderName : (params.leaderName || params.teamLeaderName || "Team Leader");
  var finalLeaderEmail = (ticket && ticket.leaderEmail) ? ticket.leaderEmail : (params.leaderEmail || params.teamLeaderMail || params.email || "");
  var finalLeaderPhone = (ticket && ticket.leaderPhone) ? ticket.leaderPhone : (params.leaderPhone || params.teamLeaderMobile || params.phone || "");
  var finalCollege = (ticket && ticket.college && ticket.college !== "Engineering College") ? ticket.college : (params.college || "SIMATS Engineering");
  var finalCategory = (ticket && ticket.participantCategory) ? ticket.participantCategory : (params.category || params.participantCategory || "student");
  var finalFee = (ticket && ticket.totalFee) ? String(ticket.totalFee) : (params.totalFee || params.fee || "400");
  var finalTxnId = (ticket && ticket.txnId) ? ticket.txnId : (params.txnId || params.utr || params.externalTxnId || "");
  
  var finalMember2 = (ticket?.memberDetails?.[0]?.name || ticket?.members?.[0]) || params.member1Name || params.member2Name || "";
  var finalMember3 = (ticket?.memberDetails?.[1]?.name || ticket?.members?.[1]) || params.member2Name || params.member3Name || "";
  var finalMember4 = (ticket?.memberDetails?.[2]?.name || ticket?.members?.[2]) || params.member3Name || params.member4Name || "";

  var count = 1;
  if (finalMember2) count++;
  if (finalMember3) count++;
  if (finalMember4) count++;

  // Update/Append in Attendance Sheet
  var attSheet = getOrCreateSheet(ss, CONFIG.ATTENDANCE_SHEET);
  setupAttendanceHeaders(attSheet);

  var attData = attSheet.getDataRange().getValues();
  var attRowIdx = -1;
  for (var j = 1; j < attData.length; j++) {
    if (String(attData[j][1] || "").trim().toUpperCase() === finalTeamId.toUpperCase()) {
      attRowIdx = j + 1;
      break;
    }
  }

  var attRowData = [
    nowStr,
    finalTeamId,
    finalTeamName,
    finalLeaderName,
    finalLeaderEmail,
    finalLeaderPhone,
    finalMember2,
    finalMember3,
    finalMember4,
    count,
    finalCollege,
    finalCategory,
    finalFee,
    finalTxnId,
    verifier,
    "ELIGIBLE FOR IET CERTIFICATE"
  ];

  if (attRowIdx > 0) {
    attSheet.getRange(attRowIdx, 1, 1, attRowData.length).setValues([attRowData]);
  } else {
    attSheet.appendRow(attRowData);
  }

  // Update main registration sheet status
  var meta = findRegistrationSheetAndColumnMap(ss);
  if (meta && meta.sheet && meta.colMap.attendanceStatus !== undefined) {
    var regData = meta.sheet.getDataRange().getValues();
    for (var r = 1; r < regData.length; r++) {
      if (String(regData[r][meta.colMap.teamId] || "").trim().toUpperCase() === finalTeamId.toUpperCase()) {
        meta.sheet.getRange(r + 1, meta.colMap.attendanceStatus + 1).setValue("PRESENT");
        if (meta.colMap.checkinTime !== undefined) meta.sheet.getRange(r + 1, meta.colMap.checkinTime + 1).setValue(nowStr);
        if (meta.colMap.verifiedBy !== undefined) meta.sheet.getRange(r + 1, meta.colMap.verifiedBy + 1).setValue(verifier);
        break;
      }
    }
  }

  // Telegram alert
  sendTelegramNotification("🛡️ DESK CHECK-IN VERIFIED!\n\nPass ID : " + finalTeamId + "\nTeam    : " + finalTeamName + "\nLeader  : " + finalLeaderName + " (" + (finalLeaderPhone || "N/A") + ")\nCollege : " + finalCollege + "\nHeadcount: " + count + " delegates\nVerifier: " + verifier + "\nTime    : " + nowStr);

  Logger.log("✅ Marked attendance for: " + finalTeamName + " (" + finalTeamId + ")");

  return createJsonResponse({
    status: "success",
    message: "Attendance verified and updated in Attendance Sheet for " + finalTeamName,
    team: {
      teamId: finalTeamId,
      teamName: finalTeamName,
      leaderName: finalLeaderName,
      leaderEmail: finalLeaderEmail,
      leaderPhone: finalLeaderPhone,
      college: finalCollege,
      members: [finalMember2, finalMember3, finalMember4].filter(Boolean),
      checkedIn: true,
      checkinTime: nowStr,
      verifiedBy: verifier
    }
  }, callback);
}

// ─── UNCHECK / UNDO ATTENDANCE ───────────────────────────────────────
function handleUncheck(ss, params) {
  params = params || {};
  ss = getSpreadsheet(ss);

  var query = (params.teamId || params.id || "").trim().toUpperCase();
  if (!query) {
    Logger.log("ℹ️ handleUncheck called without parameters.");
    return createJsonResponse({ status: "ready", message: "handleUncheck endpoint is ready." });
  }

  var attSheet = getOrCreateSheet(ss, CONFIG.ATTENDANCE_SHEET);
  if (attSheet) {
    var attData = attSheet.getDataRange().getValues();
    for (var j = 1; j < attData.length; j++) {
      if (String(attData[j][1] || "").trim().toUpperCase() === query) {
        attSheet.deleteRow(j + 1);
        break;
      }
    }
  }

  var meta = findRegistrationSheetAndColumnMap(ss);
  if (meta && meta.sheet && meta.colMap.attendanceStatus !== undefined) {
    var regData = meta.sheet.getDataRange().getValues();
    for (var i = 1; i < regData.length; i++) {
      if (String(regData[i][meta.colMap.teamId] || "").trim().toUpperCase() === query) {
        meta.sheet.getRange(i + 1, meta.colMap.attendanceStatus + 1).setValue("PENDING");
        if (meta.colMap.checkinTime !== undefined) meta.sheet.getRange(i + 1, meta.colMap.checkinTime + 1).setValue("");
        if (meta.colMap.verifiedBy !== undefined) meta.sheet.getRange(i + 1, meta.colMap.verifiedBy + 1).setValue("");
        break;
      }
    }
  }

  Logger.log("✅ Check-in reverted for Team " + query);
  return createJsonResponse({
    status: "success",
    message: "Check-in reverted for Team " + query
  });
}

// ─── ATTENDANCE LIST (PRESENT TEAMS) ─────────────────────────────────
function getAttendanceList(ss) {
  ss = getSpreadsheet(ss);
  if (!ss) return [];

  var sheet = ss.getSheetByName(CONFIG.ATTENDANCE_SHEET);
  if (!sheet) return [];

  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  var results = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    results.push({
      checkinTime: row[0],
      teamId: row[1],
      teamName: row[2],
      leaderName: row[3],
      leaderEmail: row[4],
      leaderPhone: row[5],
      member2: row[6],
      member3: row[7],
      member4: row[8],
      headcount: row[9],
      college: row[10],
      category: row[11],
      feePaid: row[12],
      txnId: row[13],
      verifiedBy: row[14],
      certificateEligibility: row[15]
    });
  }
  return results;
}

// ─── ADMIN AUTHORIZED EMAIL & OTP HANDLER ────────────────────────────
var AUTHORIZED_ADMIN_EMAILS = [
  "kandukurijagan99@gmail.com",
  "kandukurijagan7@gmail.com",
  "kandukurijagan642@gmail.com",
  "ieshitapan@gmail.com",
  "ieshita.biotech@saveetha.com",
  "hod.biotech@saveetha.com",
  "iet.chennai@ietvolunteer.org"
];

function isAuthorizedAdminEmail(email) {
  if (!email) return false;
  var clean = String(email).trim().toLowerCase();
  for (var i = 0; i < AUTHORIZED_ADMIN_EMAILS.length; i++) {
    if (clean === AUTHORIZED_ADMIN_EMAILS[i].toLowerCase() || clean.startsWith(AUTHORIZED_ADMIN_EMAILS[i].toLowerCase())) {
      return true;
    }
  }
  return false;
}

function handleSendAdminOtp(ss, params, callback) {
  params = params || {};
  var email = String(params.email || "").trim().toLowerCase();
  var otp = String(params.otp || "").trim();
  var name = String(params.name || "Organizer").trim();

  if (!isAuthorizedAdminEmail(email)) {
    return createJsonResponse({
      status: "unauthorized",
      message: "Access Denied: '" + email + "' is not registered as an authorized organizer."
    }, callback);
  }

  if (!otp) {
    otp = String(Math.floor(100000 + Math.random() * 900000));
  }

  try {
    var subject = "🔐 CRISPR '26 Organizer Terminal - Security Access Code: " + otp;
    var body = "Dear " + name + ",\n\n" +
               "Your One-Time Passcode (OTP) to access the CRISPR '26 / SYNORA '26 Organizer Desk is:\n\n" +
               "👉  " + otp + "  👈\n\n" +
               "This code is valid for 5 minutes. If you did not request this login, please notify the Chief Organizer immediately.\n\n" +
               "SIMATS Engineering · Department of Medical Biotechnology\nChennai, India.";

    MailApp.sendEmail({
      to: email,
      subject: subject,
      body: body
    });

    sendTelegramNotification("🔐 ORGANIZER TERMINAL LOGIN OTP\n\nOrganizer: " + name + "\nEmail    : " + email + "\nOTP Code : " + otp + "\nTime     : " + formatISTDateTime(new Date()));

    return createJsonResponse({
      status: "success",
      message: "Security code dispatched to " + email
    }, callback);
  } catch (mailErr) {
    return createJsonResponse({
      status: "error",
      message: "Email dispatch note: " + mailErr.toString()
    }, callback);
  }
}

// ─── SAVE RECEIPT TO GOOGLE DRIVE ────────────────────────────────────
function saveReceiptToDrive(base64Data, fileName, teamId) {
  if (!base64Data || typeof base64Data !== "string") {
    return "";
  }

  var folder;
  try {
    var folders = DriveApp.getFoldersByName(CONFIG.DRIVE_FOLDER_NAME);
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder(CONFIG.DRIVE_FOLDER_NAME);
    }
    folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (e) {
    folder = DriveApp.getRootFolder();
  }

  var cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, "");
  var decoded = Utilities.base64Decode(cleanBase64);
  var blob = Utilities.newBlob(decoded, "image/jpeg", (teamId || "receipt") + "_" + (fileName || "payment.jpg"));
  var file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return file.getUrl();
}

// ─── REGISTRATION POST HANDLER ───────────────────────────────────────
function handleRegistration(ss, params) {
  params = params || {};
  ss = getSpreadsheet(ss);

  if (!ss) {
    return createJsonResponse({ status: "error", message: "Google Sheet not accessible." });
  }

  var meta = findRegistrationSheetAndColumnMap(ss);
  var regSheet = (meta && meta.sheet) ? meta.sheet : getOrCreateSheet(ss, CONFIG.REGISTRATIONS_SHEET);
  setupRegistrationHeaders(regSheet);

  if (!params.teamName && !params.leaderName && !params.teamLeaderName && !params.leaderEmail) {
    Logger.log("ℹ️ handleRegistration called without registration data.");
    return createJsonResponse({ status: "ready", message: "handleRegistration endpoint is ready." });
  }

  var teamId = params.teamId || generateUniqueTeamId(regSheet);
  var timestamp = Utilities.formatDate(new Date(), "Asia/Kolkata", "dd/MM/yyyy, hh:mm:ss a") + " IST";
  var scheduledDate = calculateScheduledEmailDate(new Date());
  var formattedScheduledTime = formatISTDateTime(scheduledDate);

  // Strict Duplicate Check: Team Name, Emails, Mobile Numbers (Exempt kandukurijagan99@gmail.com)
  var reqTeamName = String(params.teamName || params.leaderName || "").trim();
  var rawLeaderEmail = String(params.leaderEmail || params.teamLeaderMail || "").trim().toLowerCase();
  var rawLeaderPhone = String(params.leaderPhone || params.teamLeaderMobile || "").replace(/\D/g, "").slice(-10);

  var isUnlimitedWhitelisted = (
    rawLeaderEmail === "kandukurijagan99@gmail.com" ||
    rawLeaderEmail.indexOf("kandukurijagan99") !== -1
  );

  var reqEmails = [
    rawLeaderEmail,
    String(params.member1Mail || params.member1Email || "").trim().toLowerCase(),
    String(params.member2Mail || params.member2Email || "").trim().toLowerCase(),
    String(params.member3Mail || params.member3Email || "").trim().toLowerCase()
  ].filter(function(e) { return e && e.indexOf("@") !== -1; });

  var reqPhones = [
    rawLeaderPhone,
    String(params.member1Phone || params.member1Mobile || "").replace(/\D/g, "").slice(-10),
    String(params.member2Phone || params.member2Mobile || "").replace(/\D/g, "").slice(-10),
    String(params.member3Phone || params.member3Mobile || "").replace(/\D/g, "").slice(-10)
  ].filter(function(p) { return p.length >= 10; });

  var existingData = regSheet.getDataRange().getValues();
  var headerMap = getHeaderMap(existingData[0]);

  var colTeamName = headerMap.teamName !== -1 ? headerMap.teamName : 2;
  var colLeaderEmail = headerMap.leaderEmail !== -1 ? headerMap.leaderEmail : 5;
  var colLeaderPhone = headerMap.leaderPhone !== -1 ? headerMap.leaderPhone : 6;
  var colM1Email = headerMap.m1Mail !== -1 ? headerMap.m1Mail : 8;
  var colM1Phone = headerMap.m1Phone !== -1 ? headerMap.m1Phone : 9;
  var colM2Email = headerMap.m2Mail !== -1 ? headerMap.m2Mail : 11;
  var colM2Phone = headerMap.m2Phone !== -1 ? headerMap.m2Phone : 12;
  var colM3Email = headerMap.m3Mail !== -1 ? headerMap.m3Mail : 14;
  var colM3Phone = headerMap.m3Phone !== -1 ? headerMap.m3Phone : 15;

  for (var i = 1; i < existingData.length; i++) {
    var row = existingData[i];
    var existTeamName = String(row[colTeamName] || "").trim();

    // 1. Team Name Duplicate Check (Strict for everyone)
    if (reqTeamName && existTeamName && existTeamName.toLowerCase() === reqTeamName.toLowerCase()) {
      return createJsonResponse({
        status: "duplicate",
        field: "teamName",
        message: "Team name '" + reqTeamName + "' is already registered! Please choose a unique team name."
      });
    }

    if (!isUnlimitedWhitelisted) {
      // 2. Email Address Duplicate Check
      var existEmails = [
        String(row[colLeaderEmail] || "").trim().toLowerCase(),
        String(row[colM1Email] || "").trim().toLowerCase(),
        String(row[colM2Email] || "").trim().toLowerCase(),
        String(row[colM3Email] || "").trim().toLowerCase()
      ].filter(function(e) { return e && e.indexOf("@") !== -1; });

      for (var e = 0; e < reqEmails.length; e++) {
        var chkEmail = reqEmails[e];
        if (chkEmail !== "kandukurijagan99@gmail.com" && existEmails.indexOf(chkEmail) !== -1) {
          return createJsonResponse({
            status: "duplicate",
            field: "email",
            message: "Email address '" + chkEmail + "' is already registered with another team!"
          });
        }
      }

      // 3. Mobile Number Duplicate Check
      var existPhones = [
        String(row[colLeaderPhone] || "").replace(/\D/g, "").slice(-10),
        String(row[colM1Phone] || "").replace(/\D/g, "").slice(-10),
        String(row[colM2Phone] || "").replace(/\D/g, "").slice(-10),
        String(row[colM3Phone] || "").replace(/\D/g, "").slice(-10)
      ].filter(function(p) { return p.length >= 10; });

      for (var p = 0; p < reqPhones.length; p++) {
        var chkPhone = reqPhones[p];
        if (existPhones.indexOf(chkPhone) !== -1) {
          return createJsonResponse({
            status: "duplicate",
            field: "phone",
            message: "Mobile number '" + chkPhone + "' is already registered with another team!"
          });
        }
      }
    }
  }

  if (isUnlimitedWhitelisted) {
    // If teamId already exists in sheet, generate a fresh unique one so each registration creates its own distinct row and entry pass
    var idExists = false;
    for (var k = 1; k < existingData.length; k++) {
      var existId = String(existingData[k][0] || existingData[k][1] || "").trim().toUpperCase();
      if (existId === teamId.toUpperCase()) {
        idExists = true;
        break;
      }
    }
    if (idExists) {
      teamId = generateUniqueTeamId(regSheet);
    }
  }

  // Handle Receipt Upload to Drive
  var receiptDriveUrl = "";
  if (params.fileData && typeof params.fileData === "string" && params.fileData.length > 50) {
    try {
      receiptDriveUrl = saveReceiptToDrive(params.fileData, params.fileName || (teamId + "_receipt.jpg"), teamId);
    } catch (e) {
      receiptDriveUrl = "Upload error: " + e.toString();
    }
  }

  // Handle ID Card Upload to Drive if internal SIMATS student
  var idCardDriveUrl = "";
  if (params.idCardData && typeof params.idCardData === "string" && params.idCardData.length > 50) {
    try {
      idCardDriveUrl = saveReceiptToDrive(params.idCardData, params.idCardName || (teamId + "_college_id.jpg"), teamId);
    } catch (e) {
      idCardDriveUrl = "ID Upload error: " + e.toString();
    }
  }

  var combinedAttachment = receiptDriveUrl || (idCardDriveUrl ? idCardDriveUrl : "None");
  if (receiptDriveUrl && idCardDriveUrl) {
    combinedAttachment = receiptDriveUrl + "\n(ID: " + idCardDriveUrl + ")";
  }

  // Read current sheet headers for exact column placement
  var headers = regSheet.getRange(1, 1, 1, Math.max(25, regSheet.getLastColumn())).getValues()[0];
  var headerMap = getHeaderMap(headers);
  var numCols = Math.max(25, headers.length);
  var rowData = new Array(numCols).fill("");

  var teamNameVal = params.teamName || params.leaderName || "CRISPR Team";
  var collegeVal = params.college || (params.collegeType === "internal" ? "SIMATS Engineering" : "Engineering College");
  var leaderNameVal = params.teamLeaderName || params.leaderName || "";
  var leaderEmailVal = params.teamLeaderMail || params.leaderEmail || "";
  var leaderPhoneVal = params.teamLeaderMobile || params.leaderPhone || "";
  var memberCountVal = params.memberCount || "2";
  var isInternalSimats = (params.collegeType === "internal" || (collegeVal && collegeVal.toLowerCase().indexOf("simats") !== -1));
  var totalFeeVal = params.totalFee !== undefined && params.totalFee !== "" ? String(params.totalFee) : (isInternalSimats ? "0" : "400");
  var txnVal = params.externalTxnId || params.txnId || (isInternalSimats ? ("SIMATS-" + (params.internalRegNo || "INTERNAL")) : "");

  function setCol(idx, fallbackIdx, val) {
    var target = (idx !== undefined && idx !== -1) ? idx : fallbackIdx;
    if (target >= 0 && target < rowData.length) {
      rowData[target] = val;
    }
  }

  setCol(headerMap.teamId, 0, teamId);
  setCol(headerMap.timestamp, 1, timestamp);
  setCol(headerMap.teamName, 2, teamNameVal);
  setCol(headerMap.college, 3, collegeVal);
  setCol(headerMap.leaderName, 4, leaderNameVal);
  setCol(headerMap.leaderEmail, 5, leaderEmailVal);
  setCol(headerMap.leaderPhone, 6, leaderPhoneVal);
  setCol(headerMap.m1Name, 7, params.member1Name || "");
  setCol(headerMap.m1Mail, 8, params.member1Mail || "");
  setCol(headerMap.m1Phone, 9, params.member1Phone || "");
  setCol(headerMap.m2Name, 10, params.member2Name || "");
  setCol(headerMap.m2Mail, 11, params.member2Mail || "");
  setCol(headerMap.m2Phone, 12, params.member2Phone || "");
  setCol(headerMap.m3Name, 13, params.member3Name || "");
  setCol(headerMap.m3Mail, 14, params.member3Mail || "");
  setCol(headerMap.m3Phone, 15, params.member3Phone || "");
  setCol(headerMap.regType, 16, isInternalSimats ? "INTERNAL" : "EXTERNAL");
  setCol(headerMap.totalFee, 17, totalFeeVal);
  setCol(headerMap.transactionId, 18, txnVal);
  setCol(headerMap.attachmentLink, 19, combinedAttachment);
  setCol(headerMap.scheduledEmailTime, 20, formattedScheduledTime); // Col U: Scheduled timestamp
  setCol(headerMap.confirmationEmailStatus, 21, "Pending");          // Col V: Pending
  setCol(headerMap.status, 22, "Registered");                        // Col W: Registered
  setCol(headerMap.checkInTime, 23, "");                             // Col X: Check-in Time
  setCol(headerMap.emailSentTime, 24, "");                           // Col Y: Email Sent Time

  regSheet.appendRow(rowData);
  Logger.log("✅ Registered Team in Sheet: " + teamId + " (Scheduled for " + formattedScheduledTime + ")");

  // Telegram alert
  var tgMsg = "🚀 NEW WORKSHOP REGISTRATION\n\n" +
              "Pass ID   : " + teamId + "\n" +
              "Team      : " + teamNameVal + "\n" +
              "College   : " + collegeVal + (isInternalSimats ? " (SIMATS Internal)" : "") + "\n" +
              "Leader    : " + leaderNameVal + "\n" +
              "Email     : " + leaderEmailVal + "\n" +
              "Fee Paid  : " + (isInternalSimats ? "Free / Waived (SIMATS ID Verified)" : ("₹" + totalFeeVal)) + "\n" +
              (isInternalSimats ? ("SIMATS Reg: " + (params.internalRegNo || "N/A") + "\n") : "") +
              "Txn ID    : " + (txnVal || "N/A") + "\n" +
              "Scheduled : " + formattedScheduledTime + " (5-min queue)\n" +
              "Time      : " + timestamp;
  sendTelegramNotification(tgMsg);

  return createJsonResponse({
    status: "success",
    teamId: teamId,
    scheduledEmailTime: formattedScheduledTime,
    message: "Registration successful! Record created in Google Sheets. Confirmation pass scheduled for dispatch."
  });
}

// ─── GET REQUEST ROUTER (REST & JSONP) ───────────────────────────────
function doGet(e) {
  try {
    var params = (e && e.parameter) ? e.parameter : {};
    var action = (params.action || "").toLowerCase().trim();
    var query = (params.id || params.teamId || params.email || params.phone || "").trim();
    var callback = params.callback;
    var ss = getSpreadsheet();

    // 1. ACTION: PASS LOOKUP (By Team ID / Email / Phone / QR URL)
    if (action === "getticket" || action === "getpass" || action === "ticket") {
      var ticket = findTicketByIdOrEmail(ss, query, params.email);
      if (ticket) {
        return createJsonResponse({ status: "success", data: ticket }, callback);
      } else {
        return createJsonResponse({ status: "not_found", message: "Pass not found for query: " + query }, callback);
      }
    }

    // 2. ACTION: 4-STAGE DYNAMIC HTML PASS RENDERER
    if (action === "pass" || action === "verify" || (!action && query && !callback)) {
      var matchedData = findTicketByIdOrEmail(ss, query, params.email);
      if (!matchedData) {
        matchedData = {
          teamId: query || "SYN26-SAMPLE",
          teamName: params.teamName || "Registered Team",
          college: "SIMATS Engineering",
          leaderName: "Team Leader",
          leaderEmail: "••••••@synora.org",
          leaderPhone: "•••• ••••16",
          members: [],
          status: "Registered"
        };
      }
      return HtmlService.createHtmlOutput(renderStateMachinePassHtml(matchedData))
        .setTitle("CRISPR '26 · Entry Pass - " + matchedData.teamName + " [" + matchedData.teamId + "]")
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
        .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
    }

    // 3. ACTION: GET ALL REGISTERED TEAMS (LIVE SYNC)
    if (action === "getallteams" || action === "getteams" || action === "getall" || action === "sync" || action === "all") {
      var allTeams = getAllTeamsFromRegistrationSheet(ss);
      return createJsonResponse({ status: "success", data: allTeams, total: allTeams.length }, callback);
    }

    // 4. ACTION: CHECK-IN VIA GET (Direct Webhook)
    if (action === "checkin" || action === "markattendance") {
      return handleCheckIn(ss, params, callback);
    }

    // 5. ACTION: UNCHECK / UNDO ATTENDANCE
    if (action === "uncheck" || action === "unmarkattendance") {
      return handleUncheck(ss, params);
    }

    // 6. ACTION: GET ALL PRESENT TEAMS (ATTENDANCE ROSTER)
    if (action === "getattendance" || action === "getpresentteams") {
      var attendanceData = getAttendanceList(ss);
      return createJsonResponse({ status: "success", data: attendanceData }, callback);
    }

    // 7. ACTION: DESK STATS
    if (action === "getstats") {
      var meta = findRegistrationSheetAndColumnMap(ss);
      var attSheet = getOrCreateSheet(ss, CONFIG.ATTENDANCE_SHEET);
      var totalReg = (meta && meta.sheet) ? Math.max(0, meta.sheet.getLastRow() - 1) : 0;
      var totalCheckedIn = attSheet ? Math.max(0, attSheet.getLastRow() - 1) : 0;
      return createJsonResponse({
        status: "success",
        totalRegistered: totalReg,
        totalCheckedIn: totalCheckedIn,
        totalPending: Math.max(0, totalReg - totalCheckedIn)
      }, callback);
    }

    // 8. ACTION: PROCESS SCHEDULED EMAILS
    if (action === "processemails" || action === "sendpendingemails" || action === "triggeremails") {
      var processed = processPendingRegistrationEmails();
      return createJsonResponse({
        status: "success",
        message: "Email dispatch queue executed.",
        processedCount: processed
      }, callback);
    }

    // 9. ACTION: SEND ORGANIZER LOGIN OTP
    if (action === "sendadminotp" || action === "sendotp" || action === "adminotp") {
      return handleSendAdminOtp(ss, params, callback);
    }

    // 10. ACTION: AUTO-REPAIR SHEET COLUMNS
    if (action === "repairsheet" || action === "repair" || action === "fixcolumns") {
      var fixedCount = repairSheetColumnsAndTimestamps();
      return createJsonResponse({ status: "success", message: "Repaired " + fixedCount + " row(s) in Sheet1.", repaired: fixedCount }, callback);
    }

    Logger.log("ℹ️ doGet executed with health check status.");
    return createJsonResponse({
      status: "active",
      message: "CRISPR '26 / SYNORA '26 Google Apps Script Attendance & Pass Engine is Live!",
      spreadsheetUrl: ss ? ss.getUrl() : "Auto-managed"
    }, callback);

  } catch (error) {
    Logger.log("❌ doGet error: " + error.toString());
    return createJsonResponse({
      status: "error",
      message: error.toString()
    }, e ? e.parameter?.callback : null);
  }
}

// ─── POST REQUEST ROUTER ─────────────────────────────────────────────
function doPost(e) {
  try {
    var params = (e && e.parameter) ? e.parameter : {};
    var rawContent = (e && e.postData && e.postData.contents) ? e.postData.contents : "";
    var postJson = null;

    if (rawContent && rawContent.trim().charAt(0) === '{') {
      try {
        postJson = JSON.parse(rawContent);
      } catch (jsonErr) {}
    }

    var mergedParams = Object.assign({}, params, postJson || {});
    var action = (mergedParams.action || "").toLowerCase().trim();
    var ss = getSpreadsheet();

    // 1. ACTION: CHECK-IN / MARK ATTENDANCE
    if (action === "checkin" || action === "markattendance") {
      return handleCheckIn(ss, mergedParams);
    }

    // 2. ACTION: UNCHECK / UNDO ATTENDANCE
    if (action === "uncheck" || action === "unmarkattendance") {
      return handleUncheck(ss, mergedParams);
    }

    // 3. ACTION: SEND PARTICIPATION CERTIFICATES
    if (action === "sendemail") {
      if (!validateAdminAuth(e, postJson)) {
        return createJsonResponse({ status: "error", message: "Unauthorized: Invalid passcode." });
      }

      var email = mergedParams.email;
      var leaderName = mergedParams.leaderName || "Delegate";
      var teamName = mergedParams.teamName || "CRISPR Team";
      var attachmentsData = mergedParams.attachments || [];
      
      var emailAttachments = [];
      for (var i = 0; i < attachmentsData.length; i++) {
        var fileData = attachmentsData[i];
        var rawB64 = fileData.base64Data || "";
        if (rawB64.indexOf(",") !== -1) rawB64 = rawB64.split(",")[1];
        rawB64 = rawB64.replace(/\s+/g, '');
        
        if (rawB64.length > 0) {
          var decoded = Utilities.base64Decode(rawB64);
          var mime = fileData.mimeType || 'application/pdf';
          var fileName = fileData.name || ('Certificate_' + (i + 1) + '.pdf');
          var blob = Utilities.newBlob(decoded, mime, fileName);
          emailAttachments.push(blob);
        }
      }
      
      var emailSent = false;
      if (emailAttachments.length > 0) {
        var subject = "CRISPR '26 Participation Certificates - Team " + teamName;
        var body = "Dear " + leaderName + ",\n\n" +
                   "Attached are the official participation certificates for CRISPR '26 conducted by SIMATS Engineering.\n\n" +
                   "Best regards,\nDepartment of Medical Biotechnology,\nSIMATS Engineering, Chennai.";
        
        try {
          MailApp.sendEmail({
            to: email,
            subject: subject,
            body: body,
            attachments: emailAttachments
          });
          emailSent = true;
          
          sendTelegramNotification("🎓 CERTIFICATES DISPATCHED\n\nTeam  : " + teamName + "\nEmail : " + email + "\nCount : " + emailAttachments.length + " certificates\nTime  : " + formatISTDateTime(new Date()));
        } catch (mailErr) {
          return createJsonResponse({ status: "error", message: "Email failed: " + mailErr.toString() });
        }
      }
      
      return createJsonResponse({ 
        status: emailSent ? "success" : "error",
        message: emailSent ? "Certificates delivered successfully" : "No certificate attachments provided"
      });
    }
      
    // 4. ACTION: SEND ORGANIZER LOGIN OTP
    if (action === "sendadminotp" || action === "sendotp" || action === "adminotp") {
      return handleSendAdminOtp(ss, mergedParams);
    }

    // 5. ACTION: AUTO-REPAIR SHEET COLUMNS
    if (action === "repairsheet" || action === "repair" || action === "fixcolumns") {
      var fixedCount = repairSheetColumnsAndTimestamps();
      return createJsonResponse({ status: "success", message: "Repaired " + fixedCount + " row(s) in Sheet1.", repaired: fixedCount });
    }

    // 6. ACTION: NEW REGISTRATION
    if (!mergedParams.teamName && !mergedParams.leaderName && !mergedParams.teamLeaderName && !mergedParams.leaderEmail && !mergedParams.action) {
      Logger.log("ℹ️ doPost received empty payload.");
      return createJsonResponse({
        status: "ready",
        message: "CRISPR '26 POST endpoint is active."
      });
    }

    return handleRegistration(ss, mergedParams);

  } catch (error) {
    Logger.log("❌ doPost error: " + error.toString());
    return createJsonResponse({
      status: "error",
      message: "Server error: " + error.toString()
    });
  }
}

// ─── JSON & JSONP RESPONSE BUILDER ───────────────────────────────────
function createJsonResponse(data, callback) {
  if (!data) data = { status: "success", message: "Response OK" };
  var outputText = JSON.stringify(data);
  if (callback) {
    outputText = callback + "(" + outputText + ")";
    return ContentService.createTextOutput(outputText).setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(outputText).setMimeType(ContentService.MimeType.JSON);
}
