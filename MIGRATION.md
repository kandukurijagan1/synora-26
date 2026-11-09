# Migration Guide: Database Communication & Synchronization Fixes

This document outlines the architectural changes made to fix database communication, resolve "phantom" tickets, and ensure Google Sheets remains the Single Source of Truth for Synora '26.

## 1. The API Contract (`src/services/contract.ts`)
We established a strict, unified API contract between the React frontend and the Google Apps Script backend.
- **Strict Actions:** Unknown requests now immediately fail with `status: 'error', code: 'UNKNOWN_ACTION'`. They no longer fall through and accidentally register blank teams.
- **Standardized Responses:** Every backend response is guaranteed to have a `status` (`success`, `error`, `not_found`, `duplicate`, `unauthorized`) and a `message`.

## 2. Backend Consolidation (`google-apps-script/Code.gs`)
- **Single File:** All backend logic was merged into a single `Code.gs` file. You can delete `google_apps_script.js` and `appsScriptSource.ts` as they are now obsolete.
- **LockService for Registration:** `handleRegistration` now correctly acquires a lock before doing duplicate checks and inserting a row. This guarantees that simultaneous network retries won't result in duplicate tickets.
- **Idempotent Check-ins:** `handleCheckIn` now looks up tickets strictly by `teamId`. If the team doesn't exist on the sheet, it returns `not_found`. If they are already checked in, it returns `alreadyCheckedIn: true` without failing or creating duplicates.
- **Admin Verification:** Sensitive actions (`checkin`, `uncheck`, `listteams`, etc.) are now strictly protected using the `validateAdminAuth` function.

## 3. Frontend Transport (`src/services/api.ts`)
- **Unified `callApi` function:** We removed `fetch` scattered across `api.ts` and replaced them with a central `callApi` helper.
- **CORS Bypass:** Uses `POST` with `Content-Type: text/plain` (JSON embedded in the body) everywhere. Removed all instances of `mode: 'no-cors'`, which means the frontend can now actually read server error messages (e.g., "Duplicate team name").
- **Retry & Timeout:** `callApi` implements a 10-second timeout and 2 exponential retries for network failures. Registrations are explicitly exempted from retries to prevent duplicate payments/entries.
- **Cache Replacement:** When syncing `listteams`, the frontend no longer merges the cache (which caused ghost teams to linger). Instead, a successful sync completely *replaces* `localStorage` with the authoritative data from Google Sheets.

## 4. Security & QR Codes
- **No Client-side IDs:** Phantom passes are eliminated. The frontend no longer generates its own Team ID and shows a pass before the backend completes. It awaits `status: 'success'` and uses the authoritative `teamId` from the backend.
- **XOR Encryption Removed:** We removed the pseudo XOR 'encryption' algorithm from `localStorage` in favor of standard JSON stringification.
- **Minimal QR Payload:** QR codes now strictly encode ONLY the Team ID as a URL (`https://synora.org/?id=SYN26-XXXX`). The scanner extracts the ID and verifies it against the authoritative cache, preventing injected/fake offline tickets from being parsed.

## Deployment Steps
1. Copy the entire contents of `google-apps-script/Code.gs` into your Google Apps Script editor.
2. Click **Deploy > New Deployment > Web app**. (Select "Me" and "Anyone").
3. Copy the resulting Web App URL and update `src/data/hackathonData.ts` or paste it into the organizer portal's settings.
4. Test the frontend integration.
