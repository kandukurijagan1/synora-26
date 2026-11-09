const fetch = require('node-fetch'); // Assuming node-fetch is available or using built-in fetch if Node 18+

// If running in Node 18+, fetch is available globally. Otherwise, uncomment above.
const API_URL = "https://script.google.com/macros/s/AKfycbwMxsEB3x68jm1qzJ6_Asir8JWin01IDgJLU8bXhSOhCbE0xIzJSS2zqT485ThgUGnHuA/exec";
const ADMIN_KEY = "ORGANIZER_CRISPR26"; // Fallback passcode

async function callApi(action, payload) {
  const body = JSON.stringify({ action, ...payload });
  console.log(`[>>] POST ${action} | ${body.substring(0, 100)}...`);
  
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body
  });
  
  const text = await res.text();
  console.log(`[<<] ${res.status} | ${text.substring(0, 150)}`);
  
  try {
    return JSON.parse(text);
  } catch (e) {
    return { status: 'error', message: 'Invalid JSON response' };
  }
}

async function runTests() {
  console.log("=== STARTING API CONTRACT TESTS ===");

  // 1. Test Unknown Action
  console.log("\n--- Testing Unknown Action ---");
  const resUnknown = await callApi("bogus_action", {});
  if (resUnknown.code === "UNKNOWN_ACTION") console.log("✅ Unknown action correctly blocked.");
  else console.log("❌ Failed unknown action test.");

  // 2. Test Unauthorized Access (listteams)
  console.log("\n--- Testing Unauthorized Access ---");
  const resAuth = await callApi("listteams", { adminKey: "wrong_password" });
  if (resAuth.status === "unauthorized") console.log("✅ Unauthorized access correctly blocked.");
  else console.log("❌ Failed unauthorized test.");

  // 3. Test Authorized Access (listteams)
  console.log("\n--- Testing Authorized Access ---");
  const resList = await callApi("listteams", { adminKey: ADMIN_KEY });
  if (resList.status === "success" && Array.isArray(resList.data)) console.log(`✅ Fetched ${resList.data.length} teams.`);
  else console.log("❌ Failed listteams test.");

  // 4. Test Registration (Dry run, we use a random string to avoid permanently taking up a name)
  console.log("\n--- Testing Registration & Locking ---");
  const testTeamName = "TestSync-" + Date.now();
  const regPayload = {
    requestId: "test-req-" + Date.now(),
    teamName: testTeamName,
    track: "AI",
    college: "Test College",
    collegeType: "external",
    category: "student",
    leaderName: "Test Leader",
    leaderEmail: "test-" + Date.now() + "@synora.org",
    leaderPhone: "9999999999",
    leaderYear: "3rd Year",
    totalFee: 400
  };

  const resReg = await callApi("register", regPayload);
  if (resReg.status === "success") {
    console.log("✅ Registration successful. Team ID:", resReg.teamId);
    
    // Test Check-in
    console.log("\n--- Testing Check-in ---");
    const resCheckin = await callApi("checkin", { adminKey: ADMIN_KEY, teamId: resReg.teamId });
    if (resCheckin.status === "success") console.log("✅ Check-in successful.");
    else console.log("❌ Check-in failed.", resCheckin);

    // Test Idempotent Check-in
    const resCheckin2 = await callApi("checkin", { adminKey: ADMIN_KEY, teamId: resReg.teamId });
    if (resCheckin2.alreadyCheckedIn) console.log("✅ Duplicate check-in correctly handled (Idempotent).");
    else console.log("❌ Duplicate check-in not marked.", resCheckin2);

    // Test Uncheck
    console.log("\n--- Testing Uncheck ---");
    const resUncheck = await callApi("uncheck", { adminKey: ADMIN_KEY, teamId: resReg.teamId });
    if (resUncheck.status === "success") console.log("✅ Uncheck successful.");
    else console.log("❌ Uncheck failed.", resUncheck);

  } else {
    console.log("❌ Registration failed.", resReg);
  }

  console.log("\n=== TESTS COMPLETE ===");
}

runTests().catch(console.error);
