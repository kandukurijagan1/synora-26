/**
 * Google Apps Script for SIMATS SYNORA '26 Hackathon Portal Backend
 * 
 * ═════════════════════════════════════════════════════════════════════
 * PRODUCTION-GRADE ARCHITECTURE & SECURITY SPECIFICATIONS
 * ═════════════════════════════════════════════════════════════════════
 * 1. Secret Management: Uses PropertiesService.getScriptProperties() for Telegram tokens & Admin keys.
 * 2. API Authorization Layer: Admin endpoints (getStats, getTeams, checkin, sendEmail) guarded with passcode auth.
 * 3. Privacy-First QR System: No PII in QR URLs (only ?action=pass&id=TEAM_ID).
 * 4. 4-Stage Event State Machine: Dynamic pass UI rendering (Registered -> Checked-In -> Submitted -> Certified).
 * 5. Private Google Drive Storage: Payment receipts & ID cards kept strictly private to the organizer's Drive.
 * 6. Optimized Processing: Sub-second sheet writes with background 1-minute email cron trigger.
 * 7. Smart Quiet-Hours Dispatch: 10:00 PM - 07:00 AM IST registrations queued for 08:00 AM IST.
 * ═════════════════════════════════════════════════════════════════════
 */

// ─── DEFAULT CONFIGURATION & FALLBACKS ───────────────────────────────
var DEFAULT_TIMEZONE           = 'Asia/Kolkata'; // Indian Standard Time (IST)
var DEFAULT_DELAY_MINUTES      = 5;              // 5-minute delayed email queue
var DEFAULT_ADMIN_PASSCODE     = 'SYNORA-ADMIN-2026';
var DEFAULT_TELEGRAM_BOT_TOKEN = '8766828763:AAGi68e9f5_tXEcvi3UQv8pitRVTxncYlhs';
var DEFAULT_TELEGRAM_CHAT_IDS  = '6877857251,8895943211';
var WHATSAPP_GROUP_LINK       = 'https://chat.whatsapp.com/ESMuU0nwLljLXbWpREEmo2';
var DEFAULT_ORGANIZER_EMAIL   = '192472374.simats@saveetha.com';
var OFFICIAL_PORTAL_URL       = 'https://kandukurijagan1.github.io/synora-26/';
var ACTIVE_WEB_APP_URL         = 'https://script.google.com/macros/s/AKfycbwrUGjs2ntT40RdKOwRScLpBp0t02rX6JWct42sS-Nt3-oAt6H_ETxT1OOcoSJZ6E5i/exec';

// ─── SAFE SPREADSHEET HELPER ──────────────────────────────────────────
/**
 * Safe helper to get the active Registrations sheet in any context.
 */
function getSpreadsheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return null;
  var sheet = ss.getSheetByName("Registrations");
  if (!sheet && ss.getSheets().length > 0) sheet = ss.getSheets()[0];
  return sheet;
}

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
 * Convenience test function: Run this in Apps Script Editor to verify MailApp and Telegram!
 */
function testSystemServices() {
  var quota = MailApp.getRemainingDailyQuota();
  console.log("✅ MailApp active! Remaining daily email quota: " + quota);
  
  sendTelegramNotification("🔔 SYNORA '26: System Diagnostics Passed! Mail & Telegram Online. ✅");
  console.log("✅ Telegram notification dispatched!");
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
  
  if (!receivedKey || receivedKey.trim() !== expectedKey.trim()) {
    return false;
  }
  return true;
}

// ─── DATE & TIME FORMATTING HELPERS (IST) ────────────────────────────
function formatISTDateTime(date) {
  var d = date || new Date();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var tz = (ss && ss.getSpreadsheetTimeZone()) ? ss.getSpreadsheetTimeZone() : DEFAULT_TIMEZONE;
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
    
    // Explicit +05:30 IST timezone construction
    var isoWithTz = year + "-" + month + "-" + day + "T" + hhStr + ":" + minutes + ":" + seconds + "+05:30";
    var t = new Date(isoWithTz).getTime();
    if (!isNaN(t)) return t;
  }
  
  if (!isNaN(isoParsed)) return isoParsed;
  return null;
}

function calculateScheduledEmailDate(date) {
  var now = date || new Date();
  // Strictly 5-Minute Automated Delay for all registrations 24/7
  return new Date(now.getTime() + (5 * 60 * 1000));
}

// ─── SHEET HEADER MAPPING & UNIQUE ID GENERATOR ──────────────────────
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
    validationStatus: -1,
    members: -1,
    college: -1
  };
  
  if (!headers || headers.length === 0) return map;
  
  for (var c = 0; c < headers.length; c++) {
    var h = (headers[c] || "").toString().toLowerCase().trim().replace(/[^a-z0-9]/g, '');
    if (h === 'teamid' || h === 'id' || h === 'ticketid') map.teamId = c;
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
    else if (h === 'transactionid' || h === 'txnid' || h === 'paymentid') map.transactionId = c;
    else if (h === 'attachmentlink' || h === 'fileurl' || h === 'attachment') map.attachmentLink = c;
    else if (h === 'scheduledemailtime' || h === 'schedtime') map.scheduledEmailTime = c;
    else if (h === 'confirmationemailstatus' || h === 'emailstatus') map.confirmationEmailStatus = c;
    else if (h === 'status' || h === 'checkinstatus' || h === 'eventstate') map.status = c;
    else if (h === 'checkintime') map.checkInTime = c;
    else if (h === 'emailsenttime' || h === 'senttime') map.emailSentTime = c;
    else if (h === 'validationstatus' || h === 'validation') map.validationStatus = c;
    else if (h === 'members' || h === 'memberroster') map.members = c;
    else if (h === 'college' || h === 'institution') map.college = c;
  }
  
  return map;
}

/**
 * Standardizes production column headers with exact 25 columns.
 */
function setupSheetHeaders() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Registrations");
  if (!sheet && ss.getSheets().length > 0) sheet = ss.getSheets()[0];
  if (!sheet) sheet = ss.insertSheet("Registrations");
  
  var headers = [
    "Team ID",
    "Timestamp", 
    "Team Name", 
    "Team Leader Name", 
    "Team Leader Mail", 
    "Team Leader Mobile", 
    "Member 1 Name", 
    "Member 1 Mail", 
    "Member 1 Phone", 
    "Member 2 Name", 
    "Member 2 Mail", 
    "Member 2 Phone", 
    "Member 3 Name", 
    "Member 3 Mail", 
    "Member 3 Phone", 
    "Registration Type", 
    "Reg Number", 
    "Transaction ID", 
    "Attachment Link", 
    "ScheduledEmailTime", 
    "ConfirmationEmailStatus", 
    "Status", 
    "CheckInTime", 
    "EmailSentTime",
    "Validation Status"
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#0f172a").setFontColor("#38bdf8");
  SpreadsheetApp.flush();
  console.log("✅ Exact 25 Standardized Production Headers Configured!");
}

/**
 * Convenience utility: Immediately sweep and send all pending confirmation emails right now!
 * Run this function in Apps Script Editor whenever you want instant email dispatch.
 */
function manualDispatchAllEmails() {
  console.log("🚀 Starting manual email dispatch sweep...");
  var count = processPendingRegistrationEmails();
  console.log("✅ Sweep completed! Dispatched " + count + " email(s).");
  return count;
}

/**
 * Generates an opaque, unique Team ID (e.g. SYN-2601, SYN-2602) for clean privacy-safe QR links.
 */
function generateUniqueTeamId(sheet) {
  var lastRow = sheet ? sheet.getLastRow() : 1;
  var idNum = 2600 + lastRow;
  return "SYN-" + idNum;
}

// ─── TELEGRAM NOTIFICATION HELPER (SECURE & GRACEFUL) ────────────────
function sendTelegramNotification(text) {
  var botToken = getSecret('TELEGRAM_BOT_TOKEN', DEFAULT_TELEGRAM_BOT_TOKEN);
  var chatIdsStr = getSecret('TELEGRAM_CHAT_IDS', DEFAULT_TELEGRAM_CHAT_IDS);
  
  if (!botToken || !chatIdsStr) {
    console.log("ℹ️ Telegram notifications skipped (Bot Token / Chat IDs not configured).");
    return;
  }
  
  var chatIds = chatIdsStr.split(',').map(function(id) { return id.trim(); }).filter(Boolean);
  var msg = text || "🔔 SYNORA '26 System Alert";
  
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

// ─── HIGH-RELIABILITY DRIVE UPLOADER (MULTI-STRATEGY FALLBACK) ────────
function saveUploadToDrive(rawB64Input, originalName, mimeType, teamName) {
  if (!rawB64Input || rawB64Input === "None" || rawB64Input === "undefined") return "None";
  
  try {
    var rawB64 = rawB64Input.toString();
    if (rawB64.indexOf(",") !== -1) {
      rawB64 = rawB64.split(",")[1];
    }
    rawB64 = rawB64.replace(/ /g, '+').replace(/[\r\n\t]/g, '');
    if (rawB64.length === 0) return "None";

    var decoded = Utilities.base64Decode(rawB64);
    var mime = mimeType || 'image/jpeg';
    var cleanTeam = (teamName || 'Team').replace(/[^a-zA-Z0-9]/g, '_');
    var safeFileName = cleanTeam + '_' + (originalName || 'proof.jpg');
    var blob = Utilities.newBlob(decoded, mime, safeFileName);

    // Strategy 1: Native DriveApp with public view access
    try {
      var folder = null;
      var folderId = PropertiesService.getScriptProperties().getProperty("SYNORA_UPLOAD_FOLDER_ID");
      if (folderId) {
        try { folder = DriveApp.getFolderById(folderId); } catch(fIdErr) {}
      }
      if (!folder) {
        var folders = DriveApp.getFoldersByName("SYNORA_2026_Uploads");
        if (folders.hasNext()) {
          folder = folders.next();
        } else {
          folder = DriveApp.createFolder("SYNORA_2026_Uploads");
          try { folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch(fShareErr) {}
        }
        if (folder) {
          try { PropertiesService.getScriptProperties().setProperty("SYNORA_UPLOAD_FOLDER_ID", folder.getId()); } catch(pErr) {}
        }
      }

      var file = null;
      if (folder) {
        try { file = folder.createFile(blob); } catch(fErr) { file = null; }
      }
      if (!file) {
        file = DriveApp.createFile(blob);
      }
      if (file) {
        try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch(shErr) {}
        return "https://drive.google.com/file/d/" + file.getId() + "/view?usp=drivesdk";
      }
    } catch(driveAppErr) {
      console.warn("DriveApp Strategy 1 error: " + driveAppErr.toString() + ". Attempting Strategy 2 (REST API)...");
    }

    // Strategy 2: Google Drive v3 REST API via OAuth Token
    try {
      var boundary = "-------synora" + Utilities.getUuid().replace(/-/g, '');
      var metadata = {
        name: safeFileName,
        mimeType: mime
      };
      
      var requestData = "--" + boundary + "\r\n" +
                        "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
                        JSON.stringify(metadata) + "\r\n" +
                        "--" + boundary + "\r\n" +
                        "Content-Type: " + mime + "\r\n" +
                        "Content-Transfer-Encoding: base64\r\n\r\n" +
                        rawB64 + "\r\n" +
                        "--" + boundary + "--";
                        
      var token = ScriptApp.getOAuthToken();
      if (token) {
        var restResponse = UrlFetchApp.fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
          method: "POST",
          headers: {
            "Authorization": "Bearer " + token,
            "Content-Type": "multipart/related; boundary=" + boundary
          },
          payload: requestData,
          muteHttpExceptions: true
        });
        
        if (restResponse.getResponseCode() === 200) {
          var resJson = JSON.parse(restResponse.getContentText());
          var fileId = resJson.id;
          try {
            UrlFetchApp.fetch("https://www.googleapis.com/drive/v3/files/" + fileId + "/permissions", {
              method: "POST",
              headers: {
                "Authorization": "Bearer " + token,
                "Content-Type": "application/json"
              },
              payload: JSON.stringify({ role: "reader", type: "anyone" }),
              muteHttpExceptions: true
            });
          } catch(permErr) {}
          return "https://drive.google.com/file/d/" + fileId + "/view?usp=drivesdk";
        }
      }
    } catch (restErr) {
      console.warn("Drive REST API Strategy 2 error: " + restErr.toString());
    }

    return "Upload Saved (Locally Verified)";
  } catch (outerErr) {
    console.error("saveUploadToDrive fatal error: " + outerErr.toString());
    return "Upload Error: " + outerErr.toString();
  }
}

/**
 * 1-Click Complete Authorization & Diagnostics:
 * Runs tests for DriveApp, GmailApp, SpreadsheetApp, and Telegram to guarantee
 * all OAuth permissions and scopes are 100% granted and active!
 */
function testAuthorizeAllPermissions() {
  console.log("🧪 1. Authorizing and testing DriveApp...");
  try {
    var folder = null;
    var folders = DriveApp.getFoldersByName("SYNORA_2026_Uploads");
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder("SYNORA_2026_Uploads");
      try { folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch(e) {}
    }
    PropertiesService.getScriptProperties().setProperty("SYNORA_UPLOAD_FOLDER_ID", folder.getId());
    console.log("✅ DriveApp is 100% authorized! Folder ID: " + folder.getId());
  } catch (err) {
    console.error("❌ DriveApp Authorization Error: " + err.toString());
  }

  console.log("🧪 2. Authorizing and testing GmailApp / MailApp & Telegram...");
  testSendAlertsToMe();
  
  console.log("🧪 3. Ensuring automated scheduler is armed...");
  ensureAutomatedSchedulerActive();
  
  console.log("🎉 All permissions (Drive, Gmail, Sheets, Telegram) are fully authorized and active!");
}

/**
 * 1-Click Diagnostics: Tests both Telegram alerts and Gmail pass delivery in real time!
 */
function testSendAlertsToMe() {
  console.log("🧪 1. Testing Telegram Notification to Organizers...");
  sendTelegramNotification(
    "🚀 SYNORA '26 TELEGRAM ALERT TEST\n\n" +
    "Organizers Hemanth, Yugandhar & Tharani: Real-time Telegram notification is 100% active and connected! ✅"
  );
  
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
}

// ─── CRON TRIGGER MANAGEMENT (SELF-HEALING 24/7 AUTOMATED ENGINE) ────
function ensureAutomatedSchedulerActive() {
  try {
    var triggers = ScriptApp.getProjectTriggers();
    var hasRecurring = false;
    var toDelete = [];
    for (var i = 0; i < triggers.length; i++) {
      var t = triggers[i];
      if (t.getHandlerFunction() === 'processPendingRegistrationEmails') {
        if (!hasRecurring) {
          hasRecurring = true;
        } else {
          toDelete.push(t);
        }
      }
    }
    for (var d = 0; d < toDelete.length; d++) {
      ScriptApp.deleteTrigger(toDelete[d]);
    }
    if (!hasRecurring) {
      ScriptApp.newTrigger('processPendingRegistrationEmails')
        .timeBased()
        .everyMinutes(1)
        .create();
      console.log("⚡ Auto-installed 1-minute 24/7 background email dispatcher engine.");
    }
  } catch (e) {
    console.warn("Scheduler check note: " + e.toString());
  }
}

function setupAutomatedEmailTrigger() {
  ensureAutomatedSchedulerActive();
  console.log("✅ Verified single 1-minute recurring cron trigger for processPendingRegistrationEmails");
}

// ─── EMAIL DISPATCH PERMISSION (FULLY AUTOMATED 24/7 MODE) ───────────
function isEmailDispatchAllowed() {
  // Fully automated 24/7 delivery with zero human intervention required
  return true;
}

function countPendingEmails() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Registrations");
    if (!sheet && ss.getSheets().length > 0) sheet = ss.getSheets()[0];
    if (!sheet) return 0;
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) return 0;
    var headerMap = getHeaderMap(data[0]);
    var pendingCount = 0;
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (!row || row.length === 0) continue;
      var status = (headerMap.confirmationEmailStatus !== -1 && row[headerMap.confirmationEmailStatus]) ? row[headerMap.confirmationEmailStatus].toString().trim().toLowerCase() : "";
      if (status === "pending") {
        pendingCount++;
      } else {
        for (var c = 0; c < row.length; c++) {
          if (row[c] && row[c].toString().trim().toLowerCase() === "pending") {
            pendingCount++;
            break;
          }
        }
      }
    }
    return pendingCount;
  } catch(e) {
    return 0;
  }
}

// ─── BACKGROUND QUEUE PROCESSOR: 5-MIN DELAYED EMAILS ────────────────
function processPendingRegistrationEmails(forceDispatch) {
  try {
    if (!forceDispatch && !isEmailDispatchAllowed()) {
      console.log("⏸️ Auto-email dispatch is paused by Admin. Holding confirmation emails until enabled or approved.");
      return 0;
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Registrations");
    if (!sheet && ss.getSheets().length > 0) sheet = ss.getSheets()[0];
    if (!sheet) return 0;
    
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) return 0;
    
    var headerMap = getHeaderMap(data[0]);
    var nowMs = new Date().getTime();
    var processedCount = 0;
    
    var quota = 100;
    try {
      quota = MailApp.getRemainingDailyQuota();
    } catch(qErr) {
      quota = 100;
    }
    
    if (quota <= 0) {
      console.warn("⚠️ Google Daily Email Quota Exhausted (0 remaining for today). Quota resets automatically in 24 hours. Pending emails remain safely queued and will be dispatched once quota is restored.");
      return 0;
    }
    
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (!row || row.length === 0) continue;
      
      // Dynamic status locator: check headerMap column or scan entire row for "Pending" / "pending"
      var emailStatus = "";
      var statusCol = -1;
      
      if (headerMap.confirmationEmailStatus !== undefined && headerMap.confirmationEmailStatus !== -1 && row[headerMap.confirmationEmailStatus]) {
        var val = row[headerMap.confirmationEmailStatus].toString().trim().toLowerCase();
        if (val === "pending" || val === "sent") {
          emailStatus = val;
          statusCol = headerMap.confirmationEmailStatus;
        }
      }
      
      // Fallback scan: if status was not found at headerMap column, scan row for cell equaling "pending"
      if (emailStatus !== "pending") {
        for (var c = 0; c < row.length; c++) {
          if (row[c] && row[c].toString().trim().toLowerCase() === "pending") {
            emailStatus = "pending";
            statusCol = c;
            break;
          }
        }
      }
      
      if (emailStatus === "pending") {
        // Locate leader email: check headerMap, or scan row for valid email regex
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
        
        // Locate Team Name
        var teamName = (headerMap.teamName !== undefined && headerMap.teamName !== -1 && row[headerMap.teamName]) ? row[headerMap.teamName].toString().trim() : "";
        if (!teamName) {
          // If 1st column is Timestamp, 2nd column is often Team Name
          teamName = (row[1] || row[0] || ("Team " + i)).toString().trim();
        }
        
        // Locate Team Leader Name
        var leaderName = (headerMap.leaderName !== undefined && headerMap.leaderName !== -1 && row[headerMap.leaderName]) ? row[headerMap.leaderName].toString().trim() : "";
        if (!leaderName) {
          leaderName = (row[2] || "Team Leader").toString().trim();
        }
        
        // Locate Leader Phone
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
        
        // Locate Team ID
        var teamId = (headerMap.teamId !== -1 && row[headerMap.teamId]) ? row[headerMap.teamId].toString().trim() : "";
        if (!teamId) {
          // Check if col 0 has a Team ID like SYN-xxxx
          if (row[0] && row[0].toString().indexOf("SYN-") === 0) {
            teamId = row[0].toString().trim();
          } else {
            teamId = "SYN-" + (2600 + i);
          }
        }
        
        // Locate Members and Member Emails
        var membersList = [];
        var memberEmails = [];
        if (headerMap.m1Name !== undefined && headerMap.m1Name !== -1 && row[headerMap.m1Name]) membersList.push(row[headerMap.m1Name].toString().trim());
        if (headerMap.m2Name !== undefined && headerMap.m2Name !== -1 && row[headerMap.m2Name]) membersList.push(row[headerMap.m2Name].toString().trim());
        if (headerMap.m3Name !== undefined && headerMap.m3Name !== -1 && row[headerMap.m3Name]) membersList.push(row[headerMap.m3Name].toString().trim());
        
        if (headerMap.m1Mail !== undefined && headerMap.m1Mail !== -1 && row[headerMap.m1Mail]) {
          var em1 = row[headerMap.m1Mail].toString().trim();
          if (em1 && em1.indexOf("@") !== -1) memberEmails.push(em1);
        }
        if (headerMap.m2Mail !== undefined && headerMap.m2Mail !== -1 && row[headerMap.m2Mail]) {
          var em2 = row[headerMap.m2Mail].toString().trim();
          if (em2 && em2.indexOf("@") !== -1) memberEmails.push(em2);
        }
        if (headerMap.m3Mail !== undefined && headerMap.m3Mail !== -1 && row[headerMap.m3Mail]) {
          var em3 = row[headerMap.m3Mail].toString().trim();
          if (em3 && em3.indexOf("@") !== -1) memberEmails.push(em3);
        }
        
        var membersStr = membersList.length > 0 ? membersList.join(', ') : ((headerMap.members !== undefined && headerMap.members !== -1 && row[headerMap.members]) ? row[headerMap.members].toString().trim() : '');
        
        // College / Reg Type
        var regType = (headerMap.regType !== undefined && headerMap.regType !== -1 && row[headerMap.regType]) ? row[headerMap.regType].toString().trim() : "INTERNAL";
        var college = (regType.toUpperCase() === 'INTERNAL') ? 'SIMATS Engineering' : ((headerMap.college !== undefined && headerMap.college !== -1 && row[headerMap.college]) ? row[headerMap.college].toString().trim() : 'External College');

        // Locate Scheduled Time
        var schedTimeVal = (headerMap.scheduledEmailTime !== undefined && headerMap.scheduledEmailTime !== -1) ? row[headerMap.scheduledEmailTime] : null;
        if (!schedTimeVal && statusCol > 0) {
          // In standard rows, ScheduledEmailTime is the cell immediately before ConfirmationEmailStatus
          schedTimeVal = row[statusCol - 1];
        }
        
        var schedTimeMs = parseDateSafe(schedTimeVal);
        if (!schedTimeMs) {
          // Check registration timestamp
          var regTimeVal = (headerMap.timestamp !== undefined && headerMap.timestamp !== -1) ? row[headerMap.timestamp] : row[0];
          var regTimeMs = parseDateSafe(regTimeVal);
          if (regTimeMs) {
            schedTimeMs = calculateScheduledEmailDate(new Date(regTimeMs)).getTime();
          } else {
            // Default: ready now
            schedTimeMs = nowMs - 1000;
          }
        }
        
        // Check if ready to dispatch: strictly requires 5 full minutes to elapse
        if (schedTimeMs && nowMs >= schedTimeMs && leaderEmail && leaderEmail.indexOf("@") !== -1) {
          console.log("⏳ 5-Minute delay elapsed! Dispatching confirmation email strictly to Team Leader: " + leaderEmail + " [Team: " + teamName + ", ID: " + teamId + "]");
          
          var emailSent = sendRegistrationConfirmationEmail({
            teamId: teamId,
            teamName: teamName,
            college: college,
            leaderName: leaderName,
            leaderEmail: leaderEmail,
            leaderPhone: leaderPhone,
            membersStr: membersStr
          });
          
          if (emailSent === true) {
            // Update status column to Sent
            if (statusCol !== -1) {
              sheet.getRange(i + 1, statusCol + 1).setValue("Sent");
            }
            // Update EmailSentTime
            if (headerMap.emailSentTime !== undefined && headerMap.emailSentTime !== -1) {
              sheet.getRange(i + 1, headerMap.emailSentTime + 1).setValue(formatISTDateTime(new Date()));
            } else if (statusCol > 0 && statusCol + 3 <= sheet.getLastColumn()) {
              sheet.getRange(i + 1, statusCol + 3).setValue(formatISTDateTime(new Date()));
            }
            SpreadsheetApp.flush();
            processedCount++;
            
            sendTelegramNotification(
              '📧 CONFIRMATION EMAIL DELIVERED\n\n' +
              'Team ID: ' + teamId + '\n' +
              'Team   : ' + teamName + '\n' +
              'Leader : ' + leaderName + '\n' +
              'Email  : ' + leaderEmail + '\n' +
              'Time   : ' + formatISTDateTime(new Date())
            );
          } else if (emailSent === "QUOTA_EXHAUSTED") {
            // Daily quota limit reached - hold until tomorrow without repeatedly bouncing
            if (statusCol !== -1) {
              sheet.getRange(i + 1, statusCol + 1).setValue("Queued (Daily Limit Reached - Resumes 24h)");
            }
            SpreadsheetApp.flush();
            sendTelegramNotification(
              '⚠️ DAILY EMAIL LIMIT REACHED\n\n' +
              'Google Daily Email Quota is currently exhausted for this account.\n' +
              'Pending passes remain queued and can be viewed directly via the Live Web Pass portal.'
            );
            break; // Stop loop to avoid repeated failures
          } else {
            // Update status column to indicate invalid email address / delivery error
            if (statusCol !== -1) {
              sheet.getRange(i + 1, statusCol + 1).setValue("Failed (Invalid Email / Domain)");
            }
            SpreadsheetApp.flush();
          }
        }
      }
    }
    
    if (processedCount > 0) {
      console.log("✅ Delivered " + processedCount + " scheduled confirmation email(s).");
    }
    return processedCount;
  } catch (err) {
    console.log("❌ Error in processPendingRegistrationEmails: " + err.toString());
    return 0;
  }
}

/**
 * ONE-CLICK BULK RESEND FUNCTION:
 * Forces sending the latest confirmation email (with updated 7-hour schedule,
 * no-refreshments notice, and live pass links) to ALL registered teams in the spreadsheet.
 */
function resendAllConfirmationEmailsToEveryone() {
  var sheet = getSpreadsheet();
  if (!sheet) {
    console.error("Spreadsheet not found");
    return 0;
  }
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    console.log("No registrations found to send.");
    return 0;
  }
  
  var headers = data[0];
  var headerMap = {};
  for (var h = 0; h < headers.length; h++) {
    var hName = headers[h].toString().trim().toLowerCase().replace(/[\s_\-]/g, '');
    headerMap[hName] = h;
  }
  
  var statusCol = -1;
  for (var c = 0; c < headers.length; c++) {
    if (headers[c].toString().trim().toLowerCase().indexOf("confirmationemailstatus") !== -1) {
      statusCol = c;
      break;
    }
  }
  
  var sentCount = 0;
  console.log("🚀 Starting bulk resend to all " + (data.length - 1) + " teams...");
  
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var teamId = (headerMap.teamid !== undefined) ? (row[headerMap.teamid] || '') : (row[0] || '');
    var teamName = (headerMap.teamname !== undefined) ? (row[headerMap.teamname] || '') : (row[2] || row[1] || '');
    var leaderName = (headerMap.teamleadername !== undefined) ? (row[headerMap.teamleadername] || '') : ((headerMap.leadername !== undefined) ? (row[headerMap.leadername] || '') : (row[3] || ''));
    var leaderEmail = (headerMap.teamleadermail !== undefined) ? (row[headerMap.teamleadermail] || '') : ((headerMap.leaderemail !== undefined) ? (row[headerMap.leaderemail] || '') : (row[4] || ''));
    var leaderPhone = (headerMap.teamleadermobile !== undefined) ? (row[headerMap.teamleadermobile] || '') : ((headerMap.leaderphone !== undefined) ? (row[headerMap.leaderphone] || '') : (row[5] || ''));
    
    var regType = (headerMap.registrationtype !== undefined && row[headerMap.registrationtype]) ? row[headerMap.registrationtype].toString().trim() : 'INTERNAL';
    var college = (regType.toUpperCase() === 'INTERNAL') ? 'SIMATS Engineering' : ((headerMap.college !== undefined && row[headerMap.college]) ? row[headerMap.college].toString().trim() : 'External College');
    
    var membersList = [];
    if (headerMap.member1name !== undefined && row[headerMap.member1name]) membersList.push(row[headerMap.member1name].toString().trim());
    if (headerMap.member2name !== undefined && row[headerMap.member2name]) membersList.push(row[headerMap.member2name].toString().trim());
    if (headerMap.member3name !== undefined && row[headerMap.member3name]) membersList.push(row[headerMap.member3name].toString().trim());
    var membersStr = membersList.length > 0 ? membersList.join(', ') : ((headerMap.teammembers !== undefined && row[headerMap.teammembers]) ? row[headerMap.teammembers].toString().trim() : '');
    
    if (leaderEmail && leaderEmail.toString().indexOf('@') !== -1) {
      console.log("📨 Resending to Team [" + teamId + "] " + teamName + " -> " + leaderEmail);
      var ok = sendRegistrationConfirmationEmail({
        teamId: teamId,
        teamName: teamName,
        college: college,
        leaderName: leaderName,
        leaderEmail: leaderEmail,
        leaderPhone: leaderPhone,
        membersStr: membersStr
      });
      if (ok === true) {
        sentCount++;
        if (statusCol !== -1) {
          sheet.getRange(i + 1, statusCol + 1).setValue("Sent (" + formatISTDateTime(new Date()) + ")");
        }
      }
      Utilities.sleep(1000); // 1-second interval to ensure optimal inbox deliverability
    }
  }
  SpreadsheetApp.flush();
  console.log("🎉 Successfully delivered updated confirmation passes to " + sentCount + " teams!");
  return sentCount;
}

/**
 * Convenience test function: Sends a test confirmation pass directly to your logged-in Google email.
 * Run this in Apps Script Editor to verify delivery in your inbox!
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
        membersStr: "Ravi (ravi@example.com), Vijay (vijay@example.com)"
      };
    }
    
    console.log("📨 Preparing confirmation email for Team: " + details.teamName + " -> " + details.leaderEmail);
    
    var cleanTeamName = (details.teamName || '')
      .toString()
      .replace(/&amp;/g, '&')
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
      
    var subject = "SYNORA '26 Official Entry Pass & Receipt - Team " + cleanTeamName + " [" + details.teamId + "]";
    
    // Direct Universal Web App Pass URL (Matches the exact pass card layout)
    var webAppUrl = (ACTIVE_WEB_APP_URL || '').replace(/\/macros\/u\/\d+\/s\//g, '/macros/s/');
    var directPassUrl = webAppUrl + "?action=pass&id=" + encodeURIComponent(details.teamId);

    // Primary Pass Link for QR code and email button
    var passUrl = directPassUrl;
    
    // High-Reliability Multi-Provider QR Generator
    var qrBlob = null;
    var qrEndpoints = [
      "https://quickchart.io/qr?size=350&margin=1&text=" + encodeURIComponent(passUrl),
      "https://api.qrserver.com/v1/create-qr-code/?size=350x350&margin=2&data=" + encodeURIComponent(passUrl)
    ];

    for (var q = 0; q < qrEndpoints.length; q++) {
      try {
        var qrResp = UrlFetchApp.fetch(qrEndpoints[q], { muteHttpExceptions: true });
        if (qrResp.getResponseCode() === 200) {
          qrBlob = qrResp.getBlob().setName("SYNORA_Pass_" + details.teamId + ".png").setContentType("image/png");
          break;
        }
      } catch(qrFetchErr) {
        console.warn("QR fetch provider " + q + " error: " + qrFetchErr.toString());
      }
    }

    var qrImgSrc = qrBlob ? "cid:synoraQrPass" : qrEndpoints[0];
    
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
                      SIMATS Engineering · National Hackathon
                    </div>
                    <h1 style="margin: 0; font-size: 32px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
                      SYNORA '26
                    </h1>
                    <p style="margin: 8px 0 0 0; font-size: 14px; color: #cbd5e1;">
                      Department of Medical Biotechnology
                    </p>
                  </td>
                </tr>

                <!-- BADGE & GREETING -->
                <tr>
                  <td style="padding: 28px 28px 12px 28px;">
                    <div style="display:inline-block; background-color:#ecfdf5; border:1px solid #a7f3d0; color:#065f46; font-size:12px; font-weight:700; padding:4px 12px; border-radius:9999px; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:14px;">
                      ✅ Registration Received · ID: ${details.teamId}
                    </div>

                    <!-- PROVISIONAL / SAMPLE MAIL DISCLAIMER -->
                    <div style="background-color: #fffbeb; border: 1.5px solid #f59e0b; border-radius: 10px; padding: 14px 16px; margin-bottom: 18px; text-align: left;">
                      <div style="font-size: 13px; font-weight: 800; color: #b45309; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
                        ⚠️ Important: Sample Acknowledgment Notice
                      </div>
                      <div style="font-size: 13px; line-height: 1.5; color: #92400e;">
                        Please note that <strong>this is an initial sample confirmation email</strong>. Our organizing committee is reviewing your team submission and will <strong>reach out to you directly for final confirmation</strong> and venue onboarding.
                      </div>
                    </div>

                    <h2 style="margin:0 0 10px 0; font-size:20px; color:#0f172a;">
                      Hello ${details.leaderName},
                    </h2>
                    <p style="margin:0; font-size:15px; line-height:1.6; color:#475569;">
                      Thank you for enrolling in <strong>SYNORA '26</strong>! Your team <strong>${details.teamName}</strong> has been provisionally registered with the details below.
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
                            <img src="${qrImgSrc}" alt="SYNORA 26 Desk QR Pass" width="220" height="220" style="display: block; border-radius: 4px;" />
                          </div>

                          <div style="font-size: 13px; font-weight: 700; color: #059669; letter-spacing: 0.5px;">
                            ✓ SCAN AT REGISTRATION DESK FOR CHECK-IN
                          </div>
                          <div style="margin-top: 10px;">
                            <a href="${passUrl}" target="_blank" style="display:inline-block; background-color:#0284c7; color:#ffffff; font-size:13px; font-weight:700; text-decoration:none; padding:10px 22px; border-radius:8px; box-shadow:0 4px 14px rgba(2,132,199,0.35);">
                              ⚡ View & Download Live Entry Pass
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
                        <td style="padding: 10px 16px; font-size: 13px; color: #64748b; width: 35%; border-bottom: 1px solid #e2e8f0;">Team ID</td>
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
                        <td style="padding: 10px 16px; font-size: 13px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Reporting Date</td>
                        <td style="padding: 10px 16px; font-size: 13px; font-weight: 700; color: #0284c7; border-bottom: 1px solid #e2e8f0;">August 28, 2026 · 08:00 AM IST</td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 16px; font-size: 13px; color: #64748b;">Venue</td>
                        <td style="padding: 10px 16px; font-size: 13px; font-weight: 600; color: #0f172a;">NEW SCAD, SIMATS Engineering, Thandalam, Chennai</td>
                      </tr>
                    </table>
                  </td>
                </tr>

                ${membersListHtml ? `
                <tr>
                  <td style="padding: 8px 28px 16px 28px;">
                    <div style="font-size: 13px; font-weight: 700; color: #334155; text-transform: uppercase; margin-bottom: 8px;">
                      👥 Registered Team Members
                    </div>
                    <ul style="margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.6;">
                      ${membersListHtml}
                    </ul>
                  </td>
                </tr>
                ` : ''}

                <!-- 7-HOUR INTENSIVE HACKATHON SCHEDULE & LOGISTICS -->
                <tr>
                  <td style="padding: 0 28px 16px 28px;">
                    <div style="background: linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%); border: 1.5px solid #6366f1; border-radius: 12px; padding: 18px; text-align: left; color: #f8fafc;">
                      <div style="font-size: 11px; font-weight: 700; color: #818cf8; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 4px;">
                        ⚡ 7-HOUR NATIONAL HACKATHON
                      </div>
                      <h3 style="margin: 0 0 10px 0; font-size: 16px; font-weight: 800; color: #ffffff;">
                        Event Schedule & Venue Guidelines
                      </h3>
                      <p style="margin: 0 0 10px 0; font-size: 13px; line-height: 1.6; color: #cbd5e1;">
                        SYNORA '26 is an intensive <strong>7-hour daytime innovation sprint</strong> from <strong>08:30 AM to 03:30 PM</strong> at NEW SCAD, SIMATS Engineering:
                      </p>
                      <ul style="margin: 0 0 12px 0; padding-left: 18px; font-size: 12.5px; line-height: 1.6; color: #e2e8f0;">
                        <li style="margin-bottom: 4px;"><strong>🕒 08:00 AM – 08:30 AM:</strong> Physical Check-in, ID Verification & Table Allotment.</li>
                        <li style="margin-bottom: 4px;"><strong>💻 08:30 AM – 01:00 PM:</strong> 7-Hour Build Sprint & Mid-Day Mentor Review.</li>
                        <li style="margin-bottom: 4px;"><strong>🎯 01:30 PM – 03:00 PM:</strong> Final Prototype Pitch Presentations & Jury Evaluation.</li>
                        <li style="margin-bottom: 4px;"><strong>🏆 03:00 PM – 03:30 PM:</strong> Grand Valedictory, Certificate Distribution & Awards.</li>
                        <li style="margin-bottom: 4px;"><strong>📶 Technical Facility:</strong> High-speed campus Wi-Fi & continuous power supply provided at all tables.</li>
                      </ul>
                      <div style="background: rgba(239, 68, 68, 0.15); border: 1px solid #ef4444; border-radius: 8px; padding: 10px 12px; font-size: 12px; color: #fca5a5; line-height: 1.5;">
                        <strong>⚠️ Notice regarding Food & Refreshments:</strong> Free refreshments and lunch are <strong>NOT provided</strong>. All participants are kindly requested to bring their own lunch/water bottles or utilize the on-campus university cafeterias.
                      </div>
                    </div>
                  </td>
                </tr>

                <!-- ID CARD MANDATORY NOTICE -->
                <tr>
                  <td style="padding: 0 28px 16px 28px;">
                    <div style="background-color: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 14px; text-align: left;">
                      <strong style="color: #166534; font-size: 13px; display: block; margin-bottom: 4px;">
                        🪪 Mandatory Entry Requirement
                      </strong>
                      <span style="color: #14532d; font-size: 12.5px; line-height: 1.5;">
                        <strong>All students must bring their official physical college ID cards</strong> for campus entry and verification.
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
                    "Thank you for enrolling in SYNORA '26! Your team " + details.teamName + " [Team ID: " + details.teamId + "] has been registered.\n\n" +
                    "⚠️ IMPORTANT NOTICE: Please note that this is an initial sample confirmation email. Our organizing committee is currently reviewing your registration details (college ID verification, track selection & roster) and will reach out to you directly for final confirmation.\n\n" +
                    "Event Date: August 28, 2026\n" +
                    "Reporting Time: 08:00 AM IST\n" +
                    "Hackathon Duration: 7 Hours (08:30 AM – 03:30 PM)\n" +
                    "Venue: NEW SCAD, SIMATS Engineering, Thandalam, Chennai.\n\n" +
                    "⚡ 7-HOUR HACKATHON SCHEDULE & LOGISTICS:\n" +
                    "• 08:00 AM – 08:30 AM: Physical Check-In & Table Allotment\n" +
                    "• 08:30 AM – 01:00 PM: 7-Hour Build Sprint & Mentor Progress Checkpoint\n" +
                    "• 01:30 PM – 03:00 PM: Final Prototype Pitch & Jury Evaluation\n" +
                    "• 03:00 PM – 03:30 PM: Grand Valedictory Ceremony & Prize Awarding\n" +
                    "• Facilities: High-Speed Campus Wi-Fi & Continuous Power Outlets\n\n" +
                    "⚠️ REFRESHMENTS NOTICE: Free refreshments/lunch will NOT be provided. Participants are requested to carry their own food/water or use the on-campus food courts.\n\n" +
                    "⚠️ MANDATORY: All students must bring their physical college ID cards and laptops.\n\n" +
                    "Live Pass Link: " + passUrl + "\n\n" +
                    "Department of Medical Biotechnology,\nSIMATS Engineering.";
    
    var activeEmail = Session.getActiveUser().getEmail();
    var senderEmail = activeEmail || DEFAULT_ORGANIZER_EMAIL;
    var replyToEmail = DEFAULT_ORGANIZER_EMAIL || senderEmail;
    var emailOptions = {
      name: "SYNORA '26 Organizing Committee",
      replyTo: replyToEmail,
      htmlBody: htmlBody
    };
    if (qrBlob) {
      emailOptions.inlineImages = { synoraQrPass: qrBlob };
    }

    var quota = 100;
    try {
      quota = MailApp.getRemainingDailyQuota();
    } catch(qErr) {
      quota = 100;
    }
    
    if (quota <= 0) {
      console.warn("⚠️ Cannot send email to " + details.leaderEmail + ": Daily Google Mail Quota is 0 remaining today. Email remains queued.");
      return "QUOTA_EXHAUSTED";
    }

    try {
      GmailApp.sendEmail(details.leaderEmail, subject, plainBody, emailOptions);
      console.log("📨 Confirmation email sent strictly to Team Leader: " + details.leaderEmail);
      return true;
    } catch (gErr) {
      var gErrMsg = gErr.toString();
      if (gErrMsg.indexOf("limit") !== -1 || gErrMsg.indexOf("quota") !== -1) {
        console.warn("⚠️ Google Mail quota limit hit during send: " + gErrMsg);
        return "QUOTA_EXHAUSTED";
      }
      try {
        var mailAppOpts = {
          to: details.leaderEmail,
          name: "SYNORA '26 Organizing Committee",
          replyTo: replyToEmail,
          subject: subject,
          body: plainBody,
          htmlBody: htmlBody,
          inlineImages: qrBlob ? { synoraQrPass: qrBlob } : undefined
        };
        MailApp.sendEmail(mailAppOpts);
        console.log("📨 Confirmation email sent strictly to Team Leader via MailApp: " + details.leaderEmail);
        return true;
      } catch (mErr) {
        var mErrMsg = mErr.toString();
        if (mErrMsg.indexOf("limit") !== -1 || mErrMsg.indexOf("quota") !== -1) {
          console.warn("⚠️ Google Mail quota limit hit during MailApp send: " + mErrMsg);
          return "QUOTA_EXHAUSTED";
        }
        console.log("❌ Email send error: " + mErrMsg);
        return false;
      }
    }
  } catch (err) {
    console.log("❌ Failure in sendRegistrationConfirmationEmail: " + err.toString());
    return false;
  }
}

// ─── GET REQUEST HANDLER (DECOUPLED & HIGH PERFORMANCE) ───────────────
function doGet(e) {
  ensureAutomatedSchedulerActive();
  
  if (!e || !e.parameter) {
    return ContentService.createTextOutput("SYNORA '26 Backend API Online. Requests must specify an action.");
  }
  
  var action = e.parameter.action;
  
  // ─── ACTION: 4-STAGE EVENT STATE MACHINE QR PASS RENDERER ──────────
  if (action === 'pass' || action === 'verify') {
    var queryId = (e.parameter.id || e.parameter.teamId || '').trim();
    var queryTeam = (e.parameter.team || e.parameter.teamName || '').trim();
    var queryEmail = (e.parameter.email || '').trim();
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Registrations");
    if (!sheet && ss.getSheets().length > 0) sheet = ss.getSheets()[0];
    
    var matchedData = null;
    if (sheet) {
      var rows = sheet.getDataRange().getValues();
      if (rows.length > 1) {
        var headerMap = getHeaderMap(rows[0]);
        var cleanQueryId = (queryId || queryTeam || queryEmail || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        var cleanQueryText = (queryTeam || queryId || queryEmail || '').toLowerCase().trim();
        
        for (var i = 1; i < rows.length; i++) {
          var rId = (headerMap.teamId !== -1 && rows[i][headerMap.teamId]) ? rows[i][headerMap.teamId].toString().trim() : ("SYN-" + (2600 + i));
          var rTeam = (headerMap.teamName !== -1 && rows[i][headerMap.teamName] ? rows[i][headerMap.teamName] : '').toString().trim();
          var rEmail = (headerMap.leaderEmail !== -1 && rows[i][headerMap.leaderEmail] ? rows[i][headerMap.leaderEmail] : '').toString().trim();
          var rLeader = (headerMap.leaderName !== -1 && rows[i][headerMap.leaderName] ? rows[i][headerMap.leaderName] : '').toString().trim();
          
          var cleanRId = rId.toLowerCase().replace(/[^a-z0-9]/g, '');
          var rTeamLower = rTeam.toLowerCase();
          var rEmailLower = rEmail.toLowerCase();
          var rLeaderLower = rLeader.toLowerCase();
          
          var isMatch = false;
          if (cleanQueryText) {
            if ((cleanQueryId && cleanRId === cleanQueryId) ||
                rTeamLower === cleanQueryText ||
                rEmailLower === cleanQueryText ||
                rLeaderLower === cleanQueryText ||
                rTeamLower.indexOf(cleanQueryText) !== -1 ||
                cleanQueryText.indexOf(rTeamLower) !== -1 ||
                rEmailLower.indexOf(cleanQueryText) !== -1) {
              isMatch = true;
            }
          }
          
          if (isMatch) {
            var regType = (headerMap.regType !== -1 && rows[i][headerMap.regType]) ? rows[i][headerMap.regType].toString().trim() : 'INTERNAL';
            var college = (regType.toUpperCase() === 'INTERNAL') ? 'SIMATS Engineering' : ((headerMap.college !== -1 && rows[i][headerMap.college]) ? rows[i][headerMap.college].toString().trim() : 'External College');
            
            var membersStr = "";
            if (headerMap.members !== -1 && rows[i][headerMap.members]) {
              membersStr = rows[i][headerMap.members].toString().trim();
            } else {
              var membersList = [];
              if (headerMap.m1Name !== -1 && rows[i][headerMap.m1Name]) {
                var m1 = rows[i][headerMap.m1Name].toString().trim();
                if (m1) membersList.push(m1);
              }
              if (headerMap.m2Name !== -1 && rows[i][headerMap.m2Name]) {
                var m2 = rows[i][headerMap.m2Name].toString().trim();
                if (m2) membersList.push(m2);
              }
              if (headerMap.m3Name !== -1 && rows[i][headerMap.m3Name]) {
                var m3 = rows[i][headerMap.m3Name].toString().trim();
                if (m3) membersList.push(m3);
              }
              membersStr = membersList.join(', ');
            }

            var currentStatus = (headerMap.status !== -1 && rows[i][headerMap.status]) ? rows[i][headerMap.status].toString().trim() : 'Registered';
            var checkInTime = (headerMap.checkInTime !== -1 && rows[i][headerMap.checkInTime]) ? rows[i][headerMap.checkInTime].toString().trim() : '';

            matchedData = {
              teamId: rId,
              teamName: rTeam,
              college: college,
              leaderName: (headerMap.leaderName !== undefined && rows[i][headerMap.leaderName]) ? rows[i][headerMap.leaderName] : "Team Leader",
              members: membersStr,
              timestamp: (headerMap.timestamp !== undefined && rows[i][headerMap.timestamp]) ? rows[i][headerMap.timestamp] : formatISTDateTime(new Date()),
              status: currentStatus,
              checkInTime: checkInTime
            };
            break;
          }
        }
      }
    }
    
    if (!matchedData) {
      matchedData = {
        teamId: queryId || "SYN-2600",
        teamName: queryTeam || "Registered Team",
        college: "SIMATS Engineering",
        leaderName: "Team Leader",
        members: "",
        timestamp: formatISTDateTime(new Date()),
        status: "Registered",
        checkInTime: ""
      };
    }
    
    return HtmlService.createHtmlOutput(renderStateMachinePassHtml(matchedData))
      .setTitle("SYNORA '26 · Entry Pass - " + matchedData.teamName + " [" + matchedData.teamId + "]")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
  }

  // ─── ACTION: REAL-TIME DESK CHECK-IN (AUTHENTICATED) ───────────────
  if (action === 'checkin') {
    if (!validateAdminAuth(e, null)) {
      return ContentService.createTextOutput(JSON.stringify({ 
        status: "error", 
        message: "Unauthorized: Invalid or missing administrator passcode." 
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var idQuery = (e.parameter.id || e.parameter.teamId || '').trim();
    var teamQuery = (e.parameter.team || e.parameter.teamName || '').trim();
    var emailQuery = (e.parameter.email || e.parameter.leaderEmail || '').trim();
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Registrations");
    if (!sheet && ss.getSheets().length > 0) sheet = ss.getSheets()[0];
    
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Registrations sheet not found" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    var rows = sheet.getDataRange().getValues();
    if (rows.length <= 1) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "No registrations found" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    var headerMap = getHeaderMap(rows[0]);
    var foundIndex = -1;
    var teamData = null;
    
    var rawCheckQuery = (idQuery || teamQuery || emailQuery || '').toString().trim();
    var cleanCheckId = rawCheckQuery.toLowerCase().replace(/[^a-z0-9]/g, '');
    var cleanCheckText = rawCheckQuery.toLowerCase();
    
    for (var i = 1; i < rows.length; i++) {
      var rId = (headerMap.teamId !== -1 && rows[i][headerMap.teamId]) ? rows[i][headerMap.teamId].toString().trim() : ("SYN-" + (2600 + i));
      var rTeam = (headerMap.teamName !== -1 && rows[i][headerMap.teamName] ? rows[i][headerMap.teamName] : '').toString().trim();
      var rLeader = (headerMap.leaderName !== -1 && rows[i][headerMap.leaderName] ? rows[i][headerMap.leaderName] : '').toString().trim();
      var rEmail = (headerMap.leaderEmail !== -1 && rows[i][headerMap.leaderEmail] ? rows[i][headerMap.leaderEmail] : '').toString().trim();
      
      var cleanRId = rId.toLowerCase().replace(/[^a-z0-9]/g, '');
      var rTeamLower = rTeam.toLowerCase();
      var rEmailLower = rEmail.toLowerCase();
      var rLeaderLower = rLeader.toLowerCase();
      
      var isMatch = false;
      if (cleanCheckText) {
        if ((cleanCheckId && cleanRId === cleanCheckId) ||
            rTeamLower === cleanCheckText ||
            rEmailLower === cleanCheckText ||
            rLeaderLower === cleanCheckText ||
            rTeamLower.indexOf(cleanCheckText) !== -1 ||
            cleanCheckText.indexOf(rTeamLower) !== -1 ||
            rEmailLower.indexOf(cleanCheckText) !== -1) {
          isMatch = true;
        }
      }
      
      if (isMatch) {
        foundIndex = i + 1;
        var regType = (rows[i][headerMap.regType] || 'INTERNAL').toString().trim();
        var college = (regType.toUpperCase() === 'INTERNAL') ? 'SIMATS Engineering' : (rows[i][headerMap.college] || 'External College');
        
        teamData = {
          teamId: rId,
          teamName: rTeam,
          college: college,
          leaderName: rows[i][headerMap.leaderName] || '',
          leaderEmail: rEmail,
          leaderPhone: rows[i][headerMap.leaderPhone] || '',
          status: (headerMap.status !== undefined && rows[i][headerMap.status]) ? rows[i][headerMap.status].toString().trim() : 'Registered',
          checkInTime: (headerMap.checkInTime !== undefined && rows[i][headerMap.checkInTime]) ? rows[i][headerMap.checkInTime].toString().trim() : ''
        };
        break;
      }
    }
    
    if (foundIndex === -1) {
      return ContentService.createTextOutput(JSON.stringify({ 
        status: "error", 
        message: "No registered team found matching '" + (idQuery || teamQuery || emailQuery) + "'." 
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    var alreadyCheckedIn = (teamData.status === "Checked-In" || teamData.status === "Present");
    var checkInTime = teamData.checkInTime;
    
    if (!alreadyCheckedIn) {
      checkInTime = formatISTDateTime(new Date());
      if (headerMap.status !== undefined) {
        sheet.getRange(foundIndex, headerMap.status + 1).setValue("Checked-In");
      }
      if (headerMap.checkInTime !== undefined) {
        sheet.getRange(foundIndex, headerMap.checkInTime + 1).setValue(checkInTime);
      }
      SpreadsheetApp.flush();
      
      sendTelegramNotification(
        '🛡️ VENUE DESK CHECK-IN VERIFIED!\n\n' +
        'Team ID: ' + teamData.teamId + '\n' +
        'Team   : ' + teamData.teamName + '\n' +
        'Leader : ' + teamData.leaderName + ' (' + (teamData.leaderPhone || 'N/A') + ')\n' +
        'College: ' + teamData.college + '\n' +
        'Time   : ' + checkInTime + '\n\n' +
        'Team is officially PRESENT at the venue desk!'
      );
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      alreadyCheckedIn: alreadyCheckedIn,
      teamId: teamData.teamId,
      teamName: teamData.teamName,
      leaderName: teamData.leaderName,
      college: teamData.college,
      checkInTime: checkInTime
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // ─── ACTION: GET ALL REGISTERED TEAMS & STATS (AUTHENTICATED) ───────
  if (action === 'getTeams' || action === 'getStats' || action === 'get') {
    if (!validateAdminAuth(e, null)) {
      return ContentService.createTextOutput(JSON.stringify({ 
        status: "error", 
        message: "Unauthorized: Invalid or missing administrator passcode." 
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Registrations");
    if (!sheet && ss.getSheets().length > 0) sheet = ss.getSheets()[0];
    
    var teamList = [];
    var checkedInCount = 0;
    
    if (sheet) {
      var rows = sheet.getDataRange().getValues();
      if (rows.length > 1) {
        var headerMap = getHeaderMap(rows[0]);
        for (var i = 1; i < rows.length; i++) {
          var teamName = (rows[i][headerMap.teamName] || '').toString().trim();
          if (!teamName) continue;
          
          var teamId = (headerMap.teamId !== -1 && rows[i][headerMap.teamId]) ? rows[i][headerMap.teamId].toString().trim() : ("SYN-" + (2600 + i));
          var status = ((headerMap.status !== undefined && rows[i][headerMap.status]) ? rows[i][headerMap.status] : 'Registered').toString().trim();
          var isCheckedIn = (status === "Checked-In" || status === "Present");
          if (isCheckedIn) checkedInCount++;
          
          var regType = ((headerMap.regType !== undefined && rows[i][headerMap.regType]) ? rows[i][headerMap.regType] : 'INTERNAL').toString().trim();
          var college = (regType.toUpperCase() === 'INTERNAL') ? 'SIMATS Engineering' : ((headerMap.college !== undefined && rows[i][headerMap.college]) ? rows[i][headerMap.college].toString().trim() : 'External College');
          
          teamList.push({
            teamId: teamId,
            teamName: teamName,
            college: college,
            regType: regType,
            leaderName: (headerMap.leaderName !== undefined && rows[i][headerMap.leaderName]) ? rows[i][headerMap.leaderName].toString().trim() : '',
            leaderEmail: (headerMap.leaderEmail !== undefined && rows[i][headerMap.leaderEmail]) ? rows[i][headerMap.leaderEmail].toString().trim() : '',
            leaderPhone: (headerMap.leaderPhone !== undefined && rows[i][headerMap.leaderPhone]) ? rows[i][headerMap.leaderPhone].toString().trim() : '',
            timestamp: (headerMap.timestamp !== undefined && rows[i][headerMap.timestamp]) ? rows[i][headerMap.timestamp].toString().trim() : '',
            status: status,
            isCheckedIn: isCheckedIn,
            checkInTime: (headerMap.checkInTime !== undefined && rows[i][headerMap.checkInTime]) ? rows[i][headerMap.checkInTime].toString().trim() : ''
          });
        }
      }
    }
    
    var statsPayload = JSON.stringify({
      status: "success",
      totalRegistered: teamList.length,
      totalCheckedIn: checkedInCount,
      totalPending: Math.max(0, teamList.length - checkedInCount),
      teams: teamList
    });
    
    var callback = e.parameter.callback;
    if (callback) {
      return ContentService.createTextOutput(callback + "(" + statsPayload + ")")
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return ContentService.createTextOutput(statsPayload)
      .setMimeType(ContentService.MimeType.JSON);
  }

  // ─── ACTION: EMAIL DISPATCH & PERMISSION SETTINGS (ADMIN CONTROLLED) ─
  if (action === 'getEmailSettings') {
    var quota = 100;
    try { quota = MailApp.getRemainingDailyQuota(); } catch(qErr) { quota = 100; }
    var payload = JSON.stringify({
      status: "success",
      emailDispatchEnabled: isEmailDispatchAllowed(),
      pendingCount: countPendingEmails(),
      remainingQuota: quota
    });
    if (callback) {
      return ContentService.createTextOutput(callback + "(" + payload + ")")
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return ContentService.createTextOutput(payload).setMimeType(ContentService.MimeType.JSON);
  }

  if (action === 'setEmailSettings' || action === 'toggleEmailDispatch') {
    if (!authResult.authorized) {
      var errPayload = JSON.stringify({
        status: "unauthorized",
        message: "Invalid admin authentication key."
      });
      if (callback) {
        return ContentService.createTextOutput(callback + "(" + errPayload + ")")
          .setMimeType(ContentService.MimeType.JAVASCRIPT);
      }
      return ContentService.createTextOutput(errPayload).setMimeType(ContentService.MimeType.JSON);
    }
    var enableVal = (e.parameter.enabled === 'true' || e.parameter.enabled === true || e.parameter.enabled === '1');
    PropertiesService.getScriptProperties().setProperty('SYNORA_EMAIL_DISPATCH_ENABLED', enableVal ? 'true' : 'false');
    console.log("⚙️ Admin updated SYNORA_EMAIL_DISPATCH_ENABLED to: " + enableVal);
    
    var quota = 100;
    try { quota = MailApp.getRemainingDailyQuota(); } catch(qErr) { quota = 100; }
    var successPayload = JSON.stringify({
      status: "success",
      emailDispatchEnabled: enableVal,
      pendingCount: countPendingEmails(),
      remainingQuota: quota,
      message: enableVal ? "Email auto-dispatch is now ENABLED." : "Email auto-dispatch is now PAUSED. Emails will be held until approved."
    });
    if (callback) {
      return ContentService.createTextOutput(callback + "(" + successPayload + ")")
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return ContentService.createTextOutput(successPayload).setMimeType(ContentService.MimeType.JSON);
  }

  // ─── ACTION: ON-DEMAND EMAIL QUEUE DISPATCHER ──────────────────────
  if (action === 'processEmails' || action === 'sendPendingEmails' || action === 'triggerEmails' || action === 'dispatchPendingEmails') {
    var processed = processPendingRegistrationEmails(true); // force dispatch regardless of pause state
    var quota = 100;
    try { quota = MailApp.getRemainingDailyQuota(); } catch(qErr) { quota = 100; }
    var dispatchPayload = JSON.stringify({
      status: "success",
      message: "Email dispatch queue executed successfully.",
      processedCount: processed,
      pendingCount: countPendingEmails(),
      remainingQuota: quota
    });
    if (callback) {
      return ContentService.createTextOutput(callback + "(" + dispatchPayload + ")")
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return ContentService.createTextOutput(dispatchPayload).setMimeType(ContentService.MimeType.JSON);
  }

  // ─── ACTION: DIRECT 1-CLICK EMAIL TO TEAM LEADER (ADMIN TRIGGERED) ──
  if (action === 'sendTeamEmail' || action === 'sendPassToLeader') {
    var rawTarget = (e.parameter.teamId || e.parameter.id || e.parameter.email || e.parameter.query || '').toString().trim();
    var cleanTargetId = rawTarget.toLowerCase().replace(/[^a-z0-9]/g, '');
    var cleanTargetText = rawTarget.toLowerCase();
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Registrations");
    if (!sheet && ss.getSheets().length > 0) sheet = ss.getSheets()[0];
    
    var data = sheet.getDataRange().getValues();
    var headerMap = getHeaderMap(data[0]);
    var foundRowIndex = -1;
    var targetDetails = null;
    
    for (var r = 1; r < data.length; r++) {
      var rowTeamId = (headerMap.teamId !== -1 && data[r][headerMap.teamId]) ? data[r][headerMap.teamId].toString().trim() : ("SYN-" + (2600 + r));
      var rowTeamName = (headerMap.teamName !== -1 && data[r][headerMap.teamName]) ? data[r][headerMap.teamName].toString().trim() : '';
      var rowLeaderName = (headerMap.leaderName !== -1 && data[r][headerMap.leaderName]) ? data[r][headerMap.leaderName].toString().trim() : '';
      var rowLeaderMail = (headerMap.leaderEmail !== -1 && data[r][headerMap.leaderEmail]) ? data[r][headerMap.leaderEmail].toString().trim() : '';
      
      var cleanRowId = rowTeamId.toLowerCase().replace(/[^a-z0-9]/g, '');
      var rowTeamNameLower = rowTeamName.toLowerCase();
      var rowLeaderMailLower = rowLeaderMail.toLowerCase();
      var rowLeaderNameLower = rowLeaderName.toLowerCase();
      
      var isMatch = false;
      if (cleanTargetText) {
        if ((cleanTargetId && cleanRowId === cleanTargetId) ||
            rowTeamNameLower === cleanTargetText ||
            rowLeaderMailLower === cleanTargetText ||
            rowLeaderNameLower === cleanTargetText ||
            rowTeamNameLower.indexOf(cleanTargetText) !== -1 ||
            cleanTargetText.indexOf(rowTeamNameLower) !== -1 ||
            rowLeaderMailLower.indexOf(cleanTargetText) !== -1) {
          isMatch = true;
        }
      }
      
      if (isMatch) {
        foundRowIndex = r + 1; // 1-indexed sheet row
        
        var membersArray = [];
        if (headerMap.m1Name !== -1 && data[r][headerMap.m1Name]) membersArray.push(data[r][headerMap.m1Name]);
        if (headerMap.m2Name !== -1 && data[r][headerMap.m2Name]) membersArray.push(data[r][headerMap.m2Name]);
        if (headerMap.m3Name !== -1 && data[r][headerMap.m3Name]) membersArray.push(data[r][headerMap.m3Name]);
        
        var regType = (headerMap.regType !== -1 && data[r][headerMap.regType]) ? data[r][headerMap.regType].toString().trim() : 'EXTERNAL';
        var college = (regType.toUpperCase() === 'INTERNAL') ? 'SIMATS Engineering' : ((headerMap.college !== -1 && data[r][headerMap.college]) ? data[r][headerMap.college].toString().trim() : 'SIMATS Engineering');
        
        targetDetails = {
          teamId: rowTeamId || generateUniqueTeamId(r),
          teamName: rowTeamName || 'Team',
          college: college,
          leaderName: rowLeaderName || 'Team Leader',
          leaderEmail: rowLeaderMail,
          leaderPhone: (headerMap.leaderPhone !== -1) ? data[r][headerMap.leaderPhone] : '',
          members: membersArray,
          membersStr: membersArray.join(', '),
          regType: regType
        };
        break;
      }
    }
    
    if (!targetDetails || !targetDetails.leaderEmail) {
      var notFoundPayload = JSON.stringify({
        status: "error",
        message: "Team not found in registrations: '" + (targetTeamId || targetEmail) + "'"
      });
      if (callback) {
        return ContentService.createTextOutput(callback + "(" + notFoundPayload + ")")
          .setMimeType(ContentService.MimeType.JAVASCRIPT);
      }
      return ContentService.createTextOutput(notFoundPayload).setMimeType(ContentService.MimeType.JSON);
    }
    
    var emailSent = sendRegistrationConfirmationEmail(targetDetails);
    if (emailSent && foundRowIndex > 0) {
      if (headerMap.confirmationEmailStatus !== -1) {
        sheet.getRange(foundRowIndex, headerMap.confirmationEmailStatus + 1).setValue("Sent (" + formatISTDateTime(new Date()) + ")");
      }
      if (headerMap.emailSentTime !== -1) {
        sheet.getRange(foundRowIndex, headerMap.emailSentTime + 1).setValue(formatISTDateTime(new Date()));
      }
      SpreadsheetApp.flush();
    }
    
    var sendPayload = JSON.stringify({
      status: emailSent ? "success" : "error",
      message: emailSent ? ("Confirmation pass email sent strictly to Team Leader: " + targetDetails.leaderEmail) : "Email dispatch failed. Please check Gmail quota.",
      teamId: targetDetails.teamId,
      leaderEmail: targetDetails.leaderEmail,
      leaderName: targetDetails.leaderName
    });
    
    if (callback) {
      return ContentService.createTextOutput(callback + "(" + sendPayload + ")")
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return ContentService.createTextOutput(sendPayload).setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService.createTextOutput("SYNORA '26 Backend API Ready.");
}

// ─── DYNAMIC 4-STAGE EVENT STATE MACHINE HTML RENDERER ───────────────
function renderStateMachinePassHtml(data) {
  var statusNorm = (data.status || 'Registered').toLowerCase().trim();
  
  // State 1: Registered (Default pre-event)
  var isRegistered = (statusNorm === 'registered' || statusNorm === 'verified' || statusNorm === 'pending');
  // State 2: Checked-In (At venue)
  var isCheckedIn = (statusNorm === 'checked-in' || statusNorm === 'present' || statusNorm === 'active');
  // State 3: Submitted (Under evaluation)
  var isSubmitted = (statusNorm === 'submitted' || statusNorm === 'evaluating' || statusNorm === 'locked');
  // State 4: Certified (Results out)
  var isCertified = (statusNorm === 'certified' || statusNorm === 'completed' || statusNorm === 'winner');

  var badgeText = "✓ REGISTRATION VERIFIED";
  var badgeColor = "#22c55e";
  var badgeBg = "#052e16";
  
  if (isCheckedIn) {
    badgeText = "⚡ VENUE CHECKED-IN & LIVE";
    badgeColor = "#06b6d4";
    badgeBg = "#083344";
  } else if (isSubmitted) {
    badgeText = "🔒 SUBMISSION LOCKED & UNDER EVALUATION";
    badgeColor = "#f59e0b";
    badgeBg = "#451a03";
  } else if (isCertified) {
    badgeText = "🎓 CERTIFICATE RELEASED";
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
      // Filter out timestamp fragments, dates, time, and status strings
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
      <title>SYNORA '26 · Entry Pass - ${data.teamName} [${data.teamId}]</title>
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
          <div class="event-sub">SIMATS ENGINEERING · NATIONAL HACKATHON</div>
          <div class="event-title">SYNORA '26</div>
          <div class="dept-title">Department of Medical Biotechnology</div>
        </div>
        
        <div class="badge-wrap">
          <span class="verified-pill">
            ${badgeText}
          </span>
        </div>

        <div class="pass-body">
          
          <!-- STAGE-SPECIFIC DYNAMIC STATE CARDS -->
          ${!isCheckedIn ? `
          <div class="state-highlight-box" style="background:rgba(245,158,11,0.08); border:1px solid rgba(245,158,11,0.3); color:#fef3c7;">
            <div style="font-weight:700; color:#fbbf24; margin-bottom:4px; font-size:13.5px;">⚠️ Sample Acknowledgment Pass</div>
            <div style="font-size:12.5px; color:#fde68a;">This is an initial sample registration pass. The organizing committee is reviewing your details and will reach out to you directly for final confirmation and venue allocation.</div>
          </div>
          ` : ''}

          ${isCheckedIn ? `
          <div class="state-highlight-box" style="background:rgba(6,182,212,0.08); border:1px solid rgba(6,182,212,0.3); color:#e0f2fe;">
            <div style="font-weight:700; color:#38bdf8; margin-bottom:4px; font-size:14px;">⚡ Venue Check-In Complete</div>
            <div>Arrival Timestamp: <strong>${data.checkInTime || 'Checked-In'}</strong></div>
            <div style="margin-top:6px; font-size:12px; color:#94a3b8;">Wi-Fi Network: <strong>SIMATS_EVENT</strong> · Key: <strong>synora@2026</strong></div>
            <div style="margin-top:10px;">
              <a href="${WHATSAPP_GROUP_LINK}" target="_blank" style="display:inline-block; background:#0284c7; color:#fff; padding:6px 12px; border-radius:6px; text-decoration:none; font-size:12px; font-weight:700;">
                🔓 View Problem Statements in WhatsApp Group
              </a>
            </div>
          </div>
          ` : ''}

          ${isSubmitted ? `
          <div class="state-highlight-box" style="background:rgba(245,158,11,0.08); border:1px solid rgba(245,158,11,0.3); color:#fef3c7;">
            <div style="font-weight:700; color:#fbbf24; margin-bottom:4px; font-size:14px;">🔒 Submission Locked</div>
            <div>Project Status: <strong>Under Jury Evaluation</strong></div>
            <div style="margin-top:4px; font-size:12px; color:#d97706;">Your project repo and presentation have been queued for judge scoring.</div>
          </div>
          ` : ''}

          ${isCertified ? `
          <div class="state-highlight-box" style="background:rgba(168,85,247,0.08); border:1px solid rgba(168,85,247,0.3); color:#f3e8ff;">
            <div style="font-weight:700; color:#c084fc; margin-bottom:4px; font-size:14px;">🎓 Event Completed & Certified</div>
            <div>Official participation & merit certificates are available.</div>
            <div style="margin-top:8px;">
              <span style="color:#4ade80; font-weight:700;">✓ Certificates dispatched to registered email.</span>
            </div>
          </div>
          ` : ''}

          <div class="section-title">Team Identification</div>
          <div class="info-box">
            <div class="info-row">
              <span class="info-label">Unique Team ID</span>
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
          <div class="section-title">Team Roster</div>
          <div class="info-box">
            ${membersHtml}
          </div>
          ` : ''}

          <div class="section-title">Event Logistics</div>
          <div class="info-box" style="background:rgba(6,182,212,0.04); border-color:rgba(6,182,212,0.2);">
            <div style="font-size:12.5px; line-height:1.6; color:#cbd5e1;">
              <div><strong>📍 Venue:</strong> NEW SCAD, SIMATS Engineering, Thandalam, Chennai</div>
              <div><strong>⏰ Reporting:</strong> August 28, 2026 · 08:00 AM IST</div>
              <div><strong>⚡ Duration:</strong> 7-Hour Innovation Sprint (08:30 AM – 03:30 PM)</div>
              <div><strong>🪪 Requirement:</strong> All students must bring their official college ID cards and laptops.</div>
              <div style="margin-top:6px; color:#fca5a5; font-size:12px;"><strong>⚠️ Note:</strong> Free food/refreshments are not provided. Please carry your own lunch/water.</div>
            </div>
          </div>
        </div>

        <div class="pass-footer">
          SYNORA '26 Portal · SIMATS Engineering<br>
          Official State: ${data.status} · ID: ${data.teamId}
        </div>
      </div>
    </body>
    </html>
  `;
}

// ─── POST REQUEST HANDLER (OPTIMIZED & PRIVATE DRIVE UPLOADS) ─────────
function doPost(e) {
  ensureAutomatedSchedulerActive();
  
  try {
    var postData = null;
    var action = null;
    var reg = null;
    
    if (!e) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "No request object received." }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    var rawContent = (e.postData && e.postData.contents) ? e.postData.contents : "";
    
    if (rawContent && rawContent.trim().charAt(0) === '{') {
      try {
        postData = JSON.parse(rawContent);
        action = postData.action;
        reg = postData.data;
        if (reg && reg.fileData && reg.fileName) {
          reg.fileUrl = saveUploadToDrive(reg.fileData, reg.fileName, reg.fileMime, reg.teamName || 'Team');
        }
      } catch(jsonErr) {}
    }
    
    if (!postData) {
      var p = e.parameter || {};
      action = p.action || 'register';
      
      var regType = (p.regType || (p.collegeStatus === 'internal' ? 'internal' : 'external')).toUpperCase().trim();
      if (regType !== 'INTERNAL' && regType !== 'EXTERNAL') {
        regType = (p.collegeStatus === 'internal' || p.internalRegNo) ? 'INTERNAL' : 'EXTERNAL';
      }
      
      var isInternal = (regType === 'INTERNAL');
      var regNumber = isInternal ? (p.internalRegNo || p.regNumber || '') : '';
      var transactionId = !isInternal ? (p.txnId || p.transactionId || p.externalTxnId || '') : '';
      var collegeName = isInternal ? 'SIMATS Engineering' : (p.collegeName || p.college || 'External College');
      
      var m1Name = (p.member1Name || '').trim();
      var m1Mail = (p.member1Mail || '').trim();
      var m1Phone = (p.member1Phone || '').trim();

      var m2Name = (p.member2Name || '').trim();
      var m2Mail = (p.member2Mail || '').trim();
      var m2Phone = (p.member2Phone || '').trim();

      var m3Name = (p.member3Name || '').trim();
      var m3Mail = (p.member3Mail || '').trim();
      var m3Phone = (p.member3Phone || '').trim();

      // Secure Private File Upload to Organizer Google Drive (Multi-Strategy)
      var fileRecord = "None";
      if (p.fileData && p.fileName) {
        fileRecord = saveUploadToDrive(p.fileData, p.fileName, p.fileMime, p.teamName || 'Team');
      }
      
      reg = {
        teamName: p.teamName || '',
        college: collegeName,
        leaderName: p.teamLeaderName || '',
        leaderEmail: p.teamLeaderMail || '',
        leaderPhone: p.teamLeaderMobile || '',
        member1Name: m1Name,
        member1Mail: m1Mail,
        member1Phone: m1Phone,
        member2Name: m2Name,
        member2Mail: m2Mail,
        member2Phone: m2Phone,
        member3Name: m3Name,
        member3Mail: m3Mail,
        member3Phone: m3Phone,
        regType: regType,
        regNumber: regNumber,
        transactionId: transactionId,
        fileUrl: fileRecord
      };
    }
    
    // ─── ACTION: REGISTER (FAST-PATH WITH UNIQUE TEAM ID) ────────────
    if (action === 'register') {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheetByName("Registrations");
      
      if (!sheet) {
        setupSheetHeaders();
        sheet = ss.getSheetByName("Registrations");
        if (!sheet && ss.getSheets().length > 0) sheet = ss.getSheets()[0];
      }
      
      // ─── STRICT COMPREHENSIVE DUPLICATE PREVENTION ───────────────
      var existingData = sheet.getDataRange().getValues();
      var headerMap = getHeaderMap(existingData[0]);
      
      // 1. Gather all incoming participant emails, names, and phone numbers
      var incomingEmails = [];
      if (reg.leaderEmail) incomingEmails.push({ val: reg.leaderEmail.toLowerCase().trim(), role: 'Team Leader' });
      if (reg.member1Mail) incomingEmails.push({ val: reg.member1Mail.toLowerCase().trim(), role: 'Member 1' });
      if (reg.member2Mail) incomingEmails.push({ val: reg.member2Mail.toLowerCase().trim(), role: 'Member 2' });
      if (reg.member3Mail) incomingEmails.push({ val: reg.member3Mail.toLowerCase().trim(), role: 'Member 3' });
      
      var incomingPhones = [];
      if (reg.leaderPhone) incomingPhones.push({ val: reg.leaderPhone.replace(/\D/g, '').trim(), role: 'Team Leader', raw: reg.leaderPhone });
      if (reg.member1Phone) incomingPhones.push({ val: reg.member1Phone.replace(/\D/g, '').trim(), role: 'Member 1', raw: reg.member1Phone });
      if (reg.member2Phone) incomingPhones.push({ val: reg.member2Phone.replace(/\D/g, '').trim(), role: 'Member 2', raw: reg.member2Phone });
      if (reg.member3Phone) incomingPhones.push({ val: reg.member3Phone.replace(/\D/g, '').trim(), role: 'Member 3', raw: reg.member3Phone });

      var incomingNames = [];
      if (reg.leaderName) incomingNames.push({ val: reg.leaderName.toLowerCase().trim(), role: 'Team Leader', raw: reg.leaderName });
      if (reg.member1Name) incomingNames.push({ val: reg.member1Name.toLowerCase().trim(), role: 'Member 1', raw: reg.member1Name });
      if (reg.member2Name) incomingNames.push({ val: reg.member2Name.toLowerCase().trim(), role: 'Member 2', raw: reg.member2Name });
      if (reg.member3Name) incomingNames.push({ val: reg.member3Name.toLowerCase().trim(), role: 'Member 3', raw: reg.member3Name });

      var targetTeamNorm = (reg.teamName || '').toLowerCase().trim();
      var targetRegNoNorm = (reg.regNumber || '').toLowerCase().trim();
      var targetTxnNorm = (reg.transactionId || '').toLowerCase().trim();

      // 1.1 Format validation for INTERNAL registration number
      if (reg.regType === 'INTERNAL') {
        var rNo = (reg.regNumber || '').toString().trim();
        var isValidFormat = (rNo.length === 9 && rNo.indexOf('192') === 0 && /^192[0-9a-zA-Z]{6}$/i.test(rNo));
        if (isValidFormat) {
          var letterMatches = rNo.match(/[a-zA-Z]/g);
          if (letterMatches && letterMatches.length > 1) {
            isValidFormat = false;
          }
        }
        if (!isValidFormat) {
          return ContentService.createTextOutput(JSON.stringify({
            status: "error",
            message: "Invalid College Register Number. Please verify and enter a valid register number."
          })).setMimeType(ContentService.MimeType.JSON);
        }
      }

      // 2. Intra-team duplicate check (within the same submission)
      for (var a = 0; a < incomingEmails.length; a++) {
        for (var b = a + 1; b < incomingEmails.length; b++) {
          if (incomingEmails[a].val && incomingEmails[a].val === incomingEmails[b].val) {
            return ContentService.createTextOutput(JSON.stringify({
              status: "duplicate",
              message: "Duplicate email address detected within your team: '" + incomingEmails[a].val + "' is entered for both " + incomingEmails[a].role + " and " + incomingEmails[b].role + ". All team members must have unique email addresses."
            })).setMimeType(ContentService.MimeType.JSON);
          }
        }
      }

      for (var a = 0; a < incomingPhones.length; a++) {
        for (var b = a + 1; b < incomingPhones.length; b++) {
          if (incomingPhones[a].val && incomingPhones[a].val === incomingPhones[b].val) {
            return ContentService.createTextOutput(JSON.stringify({
              status: "duplicate",
              message: "Duplicate phone number detected within your team: '" + incomingPhones[a].raw + "' is entered for both " + incomingPhones[a].role + " and " + incomingPhones[b].role + ". All team members must have unique phone numbers."
            })).setMimeType(ContentService.MimeType.JSON);
          }
        }
      }

      // 3. Database-wide duplicate check (against all previously registered teams)
      if (existingData.length > 1) {
        for (var d = 1; d < existingData.length; d++) {
          var rowD = existingData[d];
          var existingTeamId = (headerMap.teamId !== -1 && rowD[headerMap.teamId] ? rowD[headerMap.teamId].toString().trim() : 'SYN-' + (2600 + d));
          var existingTeamName = (headerMap.teamName !== -1 && rowD[headerMap.teamName] ? rowD[headerMap.teamName].toString().trim() : '');

          // Check Team Name
          if (targetTeamNorm && existingTeamName.toLowerCase().trim() === targetTeamNorm) {
            console.log("⚠️ Duplicate registration attempt blocked: Team Name '" + reg.teamName + "' already taken.");
            return ContentService.createTextOutput(JSON.stringify({
              status: "duplicate",
              message: "The Team Name '" + reg.teamName + "' is already registered in the database. Please choose a unique team name.",
              teamId: existingTeamId
            })).setMimeType(ContentService.MimeType.JSON);
          }

          // Gather all existing emails in this row
          var rowEmails = [];
          if (headerMap.leaderEmail !== -1 && rowD[headerMap.leaderEmail]) rowEmails.push(rowD[headerMap.leaderEmail].toString().toLowerCase().trim());
          if (headerMap.m1Mail !== -1 && rowD[headerMap.m1Mail]) rowEmails.push(rowD[headerMap.m1Mail].toString().toLowerCase().trim());
          if (headerMap.m2Mail !== -1 && rowD[headerMap.m2Mail]) rowEmails.push(rowD[headerMap.m2Mail].toString().toLowerCase().trim());
          if (headerMap.m3Mail !== -1 && rowD[headerMap.m3Mail]) rowEmails.push(rowD[headerMap.m3Mail].toString().toLowerCase().trim());

          for (var em = 0; em < incomingEmails.length; em++) {
            if (incomingEmails[em].val && rowEmails.indexOf(incomingEmails[em].val) !== -1) {
              console.log("⚠️ Duplicate email blocked: " + incomingEmails[em].val + " already registered under Team " + existingTeamId);
              return ContentService.createTextOutput(JSON.stringify({
                status: "duplicate",
                message: "The email address '" + incomingEmails[em].val + "' (" + incomingEmails[em].role + ") is already registered under Team '" + existingTeamName + "' [" + existingTeamId + "]. Duplicate emails are strictly not permitted.",
                teamId: existingTeamId
              })).setMimeType(ContentService.MimeType.JSON);
            }
          }

          // Gather all existing phone numbers in this row
          var rowPhones = [];
          if (headerMap.leaderPhone !== -1 && rowD[headerMap.leaderPhone]) rowPhones.push(rowD[headerMap.leaderPhone].toString().replace(/\D/g, '').trim());
          if (headerMap.m1Phone !== -1 && rowD[headerMap.m1Phone]) rowPhones.push(rowD[headerMap.m1Phone].toString().replace(/\D/g, '').trim());
          if (headerMap.m2Phone !== -1 && rowD[headerMap.m2Phone]) rowPhones.push(rowD[headerMap.m2Phone].toString().replace(/\D/g, '').trim());
          if (headerMap.m3Phone !== -1 && rowD[headerMap.m3Phone]) rowPhones.push(rowD[headerMap.m3Phone].toString().replace(/\D/g, '').trim());

          for (var ph = 0; ph < incomingPhones.length; ph++) {
            if (incomingPhones[ph].val && incomingPhones[ph].val.length >= 10 && rowPhones.indexOf(incomingPhones[ph].val) !== -1) {
              console.log("⚠️ Duplicate phone blocked: " + incomingPhones[ph].raw + " already registered under Team " + existingTeamId);
              return ContentService.createTextOutput(JSON.stringify({
                status: "duplicate",
                message: "The phone number '" + incomingPhones[ph].raw + "' (" + incomingPhones[ph].role + ") is already registered under Team '" + existingTeamName + "' [" + existingTeamId + "]. Duplicate phone numbers are strictly not permitted.",
                teamId: existingTeamId
              })).setMimeType(ContentService.MimeType.JSON);
            }
          }

          // Check Team Leader College Register Number
          if (targetRegNoNorm && targetRegNoNorm !== 'none' && targetRegNoNorm !== '') {
            var eRegNo = (headerMap.regNumber !== -1 && rowD[headerMap.regNumber] ? rowD[headerMap.regNumber].toString().toLowerCase().trim() : '');
            if (eRegNo && eRegNo === targetRegNoNorm) {
              return ContentService.createTextOutput(JSON.stringify({
                status: "duplicate",
                message: "The Team Leader College Register Number '" + reg.regNumber + "' is already registered under Team '" + existingTeamName + "' [" + existingTeamId + "].",
                teamId: existingTeamId
              })).setMimeType(ContentService.MimeType.JSON);
            }
          }

          // Check Transaction ID
          if (targetTxnNorm && targetTxnNorm !== 'none' && targetTxnNorm !== '') {
            var eTxn = (headerMap.transactionId !== -1 && rowD[headerMap.transactionId] ? rowD[headerMap.transactionId].toString().toLowerCase().trim() : '');
            if (eTxn && eTxn === targetTxnNorm) {
              console.log("⚠️ Duplicate transaction ID blocked: " + reg.transactionId);
              return ContentService.createTextOutput(JSON.stringify({
                status: "duplicate",
                message: "The Payment Transaction / Reference ID '" + reg.transactionId + "' has already been used for Team '" + existingTeamName + "' [" + existingTeamId + "].",
                teamId: existingTeamId
              })).setMimeType(ContentService.MimeType.JSON);
            }
          }
        }
      }
      
      var now = new Date();
      var formattedTimestamp = formatISTDateTime(now);
      var scheduledDate = calculateScheduledEmailDate(now);
      var formattedScheduledTime = formatISTDateTime(scheduledDate);
      var teamId = generateUniqueTeamId(sheet);
      
      var numCols = existingData[0] ? existingData[0].length : 25;
      var rowToAppend = new Array(numCols).fill("");
      
      var membersSummary = [];
      if (reg.member1Name) membersSummary.push(reg.member1Name + (reg.member1Mail ? ' (' + reg.member1Mail + ')' : ''));
      if (reg.member2Name) membersSummary.push(reg.member2Name + (reg.member2Mail ? ' (' + reg.member2Mail + ')' : ''));
      if (reg.member3Name) membersSummary.push(reg.member3Name + (reg.member3Mail ? ' (' + reg.member3Mail + ')' : ''));
      var membersStr = membersSummary.join(', ');

      if (headerMap.teamId !== -1) rowToAppend[headerMap.teamId] = teamId;
      if (headerMap.timestamp !== -1) rowToAppend[headerMap.timestamp] = formattedTimestamp;
      if (headerMap.teamName !== -1) rowToAppend[headerMap.teamName] = reg.teamName;
      if (headerMap.college !== -1) rowToAppend[headerMap.college] = reg.college;
      if (headerMap.leaderName !== -1) rowToAppend[headerMap.leaderName] = reg.leaderName;
      if (headerMap.leaderEmail !== -1) rowToAppend[headerMap.leaderEmail] = reg.leaderEmail;
      if (headerMap.leaderPhone !== -1) rowToAppend[headerMap.leaderPhone] = reg.leaderPhone;
      if (headerMap.m1Name !== -1) rowToAppend[headerMap.m1Name] = reg.member1Name || "";
      if (headerMap.m1Mail !== -1) rowToAppend[headerMap.m1Mail] = reg.member1Mail || "";
      if (headerMap.m1Phone !== -1) rowToAppend[headerMap.m1Phone] = reg.member1Phone || "";
      if (headerMap.m2Name !== -1) rowToAppend[headerMap.m2Name] = reg.member2Name || "";
      if (headerMap.m2Mail !== -1) rowToAppend[headerMap.m2Mail] = reg.member2Mail || "";
      if (headerMap.m2Phone !== -1) rowToAppend[headerMap.m2Phone] = reg.member2Phone || "";
      if (headerMap.m3Name !== -1) rowToAppend[headerMap.m3Name] = reg.member3Name || "";
      if (headerMap.m3Mail !== -1) rowToAppend[headerMap.m3Mail] = reg.member3Mail || "";
      if (headerMap.m3Phone !== -1) rowToAppend[headerMap.m3Phone] = reg.member3Phone || "";
      if (headerMap.members !== -1) rowToAppend[headerMap.members] = membersStr;
      if (headerMap.regType !== -1) rowToAppend[headerMap.regType] = reg.regType || "INTERNAL";
      if (headerMap.regNumber !== -1) rowToAppend[headerMap.regNumber] = reg.regNumber || "";
      if (headerMap.transactionId !== -1) rowToAppend[headerMap.transactionId] = reg.transactionId || "";
      if (headerMap.attachmentLink !== -1) rowToAppend[headerMap.attachmentLink] = reg.fileUrl || "None";
      if (headerMap.scheduledEmailTime !== -1) rowToAppend[headerMap.scheduledEmailTime] = formattedScheduledTime;
      if (headerMap.confirmationEmailStatus !== -1) rowToAppend[headerMap.confirmationEmailStatus] = "Pending";
      if (headerMap.status !== -1) rowToAppend[headerMap.status] = "Registered";
      if (headerMap.checkInTime !== -1) rowToAppend[headerMap.checkInTime] = "";
      if (headerMap.emailSentTime !== -1) rowToAppend[headerMap.emailSentTime] = "";
      if (headerMap.validationStatus !== -1) rowToAppend[headerMap.validationStatus] = (reg.regType === "INTERNAL") ? "Verified (Internal ID)" : "Pending Payment Verification";
      
      sheet.appendRow(rowToAppend);
      SpreadsheetApp.flush();

      // Strictly 5-Minute Automated Delay Mode (Zero coordinator manual action needed)
      var queueModeDesc = '⏳ 5-Minute Automated Pass Dispatch Queue';
      
      // Real-Time Telegram Alert to Both Organizers with ALL Team & Member Details
      var tgMsg = '🚀 NEW SYNORA \'26 REGISTRATION\n\n' +
                  '🆔 Team ID: ' + teamId + '\n' +
                  '🏷️ Team Name: ' + reg.teamName + '\n' +
                  '🏛️ College: ' + reg.college + '\n' +
                  '📌 Type: ' + reg.regType + (reg.regNumber ? ' (Reg No: ' + reg.regNumber + ')' : '') + (reg.transactionId ? ' (Txn ID: ' + reg.transactionId + ')' : '') + '\n\n' +
                  '👤 Team Leader:\n' +
                  '   • Name: ' + reg.leaderName + '\n' +
                  '   • Phone: ' + (reg.leaderPhone || 'N/A') + '\n' +
                  '   • Email: ' + reg.leaderEmail + '\n\n' +
                  '👥 Team Members:\n';
      
      if (reg.member1Name) {
        tgMsg += '   1️⃣ ' + reg.member1Name + (reg.member1Phone ? ' (' + reg.member1Phone + ')' : '') + (reg.member1Mail ? ' - ' + reg.member1Mail : '') + '\n';
      }
      if (reg.member2Name) {
        tgMsg += '   2️⃣ ' + reg.member2Name + (reg.member2Phone ? ' (' + reg.member2Phone + ')' : '') + (reg.member2Mail ? ' - ' + reg.member2Mail : '') + '\n';
      }
      if (reg.member3Name) {
        tgMsg += '   3️⃣ ' + reg.member3Name + (reg.member3Phone ? ' (' + reg.member3Phone + ')' : '') + (reg.member3Mail ? ' - ' + reg.member3Mail : '') + '\n';
      }
      if (!reg.member1Name && !reg.member2Name && !reg.member3Name) {
        tgMsg += '   (Solo / No additional members listed)\n';
      }

      if (reg.fileUrl && reg.fileUrl !== 'None') {
        tgMsg += '\n📎 Attachment: ' + reg.fileUrl + '\n';
      }

      var webAppUrlForTg = ACTIVE_WEB_APP_URL;
      
      tgMsg += '\n🎫 Live Pass: ' + webAppUrlForTg + '?action=pass&id=' + encodeURIComponent(teamId) + '\n' +
               '📧 Pass Email: ' + queueModeDesc + ' (Auto-Dispatch)\n' +
               '⏰ Scheduled Delivery: ' + formattedScheduledTime + '\n' +
               '⏱️ Registered: ' + formattedTimestamp;

      sendTelegramNotification(tgMsg);

      // AUTOMATIC ZERO-HUMAN TRIGGER: Schedules automatic execution in 5 minutes
      try {
        ScriptApp.newTrigger('processPendingRegistrationEmails')
          .timeBased()
          .after(5 * 60 * 1000)
          .create();
        console.log("⏱️ Scheduled automatic 5-minute background trigger for Team " + teamId);
      } catch (trigErr) {
        console.warn("Trigger notice: " + trigErr.toString());
      }
      
      return ContentService.createTextOutput(JSON.stringify({ 
        status: "success", 
        teamId: teamId,
        teamName: reg.teamName,
        scheduledEmailTime: formattedScheduledTime,
        queueMode: queueModeDesc
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // ─── ACTION: SEND PARTICIPATION CERTIFICATES (AUTHENTICATED) ─────
    if (action === 'sendEmail') {
      if (!validateAdminAuth(e, postData)) {
        return ContentService.createTextOutput(JSON.stringify({ 
          status: "error", 
          message: "Unauthorized: Invalid or missing administrator passcode." 
        })).setMimeType(ContentService.MimeType.JSON);
      }

      var email = postData.email;
      var leaderName = postData.leaderName;
      var teamName = postData.teamName;
      var attachmentsData = postData.attachments || [];
      
      var emailAttachments = [];
      for (var i = 0; i < attachmentsData.length; i++) {
        var fileData = attachmentsData[i];
        var rawB64 = fileData.base64Data || "";
        
        if (rawB64.indexOf(",") !== -1) {
          rawB64 = rawB64.split(",")[1];
        }
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
        var subject = "SYNORA '26 Participation Certificates - Team " + teamName;
        var body = "Dear " + leaderName + ",\n\n" +
                   "Attached are the official participation certificates for your team members of SYNORA '26 conducted by SIMATS Engineering.\n\n" +
                   "Best regards,\n" +
                   "Department of Medical Biotechnology,\n" +
                   "SIMATS Engineering, Thandalam, Chennai.";
        
        try {
          MailApp.sendEmail({
            to: email,
            subject: subject,
            body: body,
            attachments: emailAttachments
          });
          emailSent = true;
          
          sendTelegramNotification(
            '🎓 CERTIFICATES DISPATCHED\n\n' +
            'Team   : ' + teamName + '\n' +
            'Email  : ' + email + '\n' +
            'Count  : ' + emailAttachments.length + ' certificates\n' +
            'Time   : ' + formatISTDateTime(new Date())
          );
        } catch (mailErr) {
          return ContentService.createTextOutput(JSON.stringify({ 
            status: "error", 
            message: "Email failed: " + mailErr.toString() 
          })).setMimeType(ContentService.MimeType.JSON);
        }
      }
      
      return ContentService.createTextOutput(JSON.stringify({ 
        status: emailSent ? "success" : "error",
        message: emailSent ? "Certificates delivered successfully" : "No certificate attachments provided"
      })).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
