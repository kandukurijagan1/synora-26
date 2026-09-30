const fs = require('fs');
let code = fs.readFileSync('google_apps_script.js', 'utf8');

// 1. Remove the bad line from testSystemServices
code = code.replace(
  'sendTelegramNotification("🔔 SYNORA \'26 / CRISPR \'26: System Diagnostics Passed! Mail & Telegram Online. ✅");\n    cache.put(cacheKey, "sent", 180);\n  console.log("✅ Telegram notification dispatched!");',
  'sendTelegramNotification("🔔 SYNORA \'26 / CRISPR \'26: System Diagnostics Passed! Mail & Telegram Online. ✅");\n  console.log("✅ Telegram notification dispatched!");'
);

// 2. Add the correct line to handleSendAdminOtp
// First we match the sendTelegramNotification call in handleSendAdminOtp
code = code.replace(
  'sendTelegramNotification("🔐 ORGANIZER TERMINAL LOGIN OTP\\n\\nOrganizer: " + name + "\\nEmail    : " + email + "\\nOTP Code : " + otp + "\\nTime     : " + formatISTDateTime(new Date()));\n\n    return createJsonResponse',
  'sendTelegramNotification("🔐 ORGANIZER TERMINAL LOGIN OTP\\n\\nOrganizer: " + name + "\\nEmail    : " + email + "\\nOTP Code : " + otp + "\\nTime     : " + formatISTDateTime(new Date()));\n\n    cache.put(cacheKey, "sent", 180);\n\n    return createJsonResponse'
);

fs.writeFileSync('google_apps_script.js', code);
console.log('Fixed cache.put location');
