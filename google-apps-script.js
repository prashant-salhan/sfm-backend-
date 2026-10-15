/**
 * =========================================================================
 * SFM TRAVELS - GOOGLE APPS SCRIPT FOR REAL-TIME FORM ENTRIES SYNC
 * =========================================================================
 * 
 * INSTRUCTIONS:
 * 1. Open Google Sheets (create a new sheet or use an existing one).
 *    Name the sheet/tab: "Enquiries" (or keep default "Sheet1").
 * 2. Click "Extensions" in top menu -> "Apps Script".
 * 3. Delete any default code in Code.gs, paste this entire script, and click Save (💾).
 * 4. Click "Deploy" (blue button at top right) -> "New deployment".
 * 5. Select type: "Web app" (click gear icon next to Select type).
 * 6. Set Description: "SFM Travels Enquiry Sync"
 * 7. Set "Execute as": "Me (your email)"
 * 8. Set "Who has access": "Anyone"  <-- CRITICAL: MUST BE 'Anyone' so backend can POST!
 * 9. Click "Deploy", authorize permissions when prompted, and COPY the Web App URL.
 *    (It looks like: https://script.google.com/macros/s/AKfycbx.../exec)
 * 10. Paste this URL into backend .env (GOOGLE_SHEET_WEBHOOK_URL=...) or via the
 *     SFM Localhost Dashboard.
 * =========================================================================
 */

function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();

    // 1. Automatically initialize headers if sheet is brand new / empty
    if (sheet.getLastRow() === 0) {
      var headers = [
        "Date & Time (IST)",
        "Full Name",
        "Phone / WhatsApp",
        "Destination / Tour Package",
        "Trip Details & Message",
        "Source",
        "Status",
        "MongoDB Record ID"
      ];
      sheet.appendRow(headers);

      // Style header row (SFM Luxury Slate Theme)
      var headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground("#0F172A"); // Dark Slate
      headerRange.setFontColor("#F8FAFC"); // Crisp Off-White
      headerRange.setFontWeight("bold");
      headerRange.setFontSize(10);
      headerRange.setHorizontalAlignment("center");
      headerRange.setVerticalAlignment("middle");
      sheet.setRowHeight(1, 36);
      sheet.setFrozenRows(1);
    }

    var contents = e.postData ? e.postData.contents : "";
    if (!contents) {
      return createJsonResponse({ status: "error", message: "No payload received" });
    }

    var data = JSON.parse(contents);
    var rowsToAppend = [];

    // Map existing IDs in column 8 to prevent duplicates during batch sync
    var existingIds = {};
    var lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      var idValues = sheet.getRange(2, 8, lastRow - 1, 1).getValues();
      for (var i = 0; i < idValues.length; i++) {
        var idStr = String(idValues[i][0]).trim();
        if (idStr) existingIds[idStr] = true;
      }
    }

    // 2. Handle Batch Sync (All MongoDB records)
    if (data.type === "batch" && Array.isArray(data.enquiries)) {
      for (var j = 0; j < data.enquiries.length; j++) {
        var item = data.enquiries[j];
        var recordId = String(item.id || "").trim();
        if (recordId && existingIds[recordId]) {
          continue; // Skip already synced entries
        }

        rowsToAppend.push([
          item.timestamp || new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
          item.fullName || "",
          item.phone || "",
          item.destination || "",
          item.message || "",
          item.source || "website",
          item.status || "new",
          recordId
        ]);
        if (recordId) existingIds[recordId] = true;
      }
    } 
    // 3. Handle Single Real-Time Form Submission
    else {
      var singleId = String(data.id || "").trim();
      if (!singleId || !existingIds[singleId]) {
        rowsToAppend.push([
          data.timestamp || new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
          data.fullName || "",
          data.phone || "",
          data.destination || "",
          data.message || "",
          data.source || "website",
          data.status || "new",
          singleId
        ]);
      }
    }

    // Append rows and style data cells
    if (rowsToAppend.length > 0) {
      var startRow = sheet.getLastRow() + 1;
      var range = sheet.getRange(startRow, 1, rowsToAppend.length, 8);
      range.setValues(rowsToAppend);
      range.setFontSize(10);
      range.setVerticalAlignment("middle");

      // Auto-fit column widths for clear presentation
      sheet.autoResizeColumns(1, 8);
    }

    return createJsonResponse({
      status: "success",
      appendedCount: rowsToAppend.length,
      totalRows: sheet.getLastRow()
    });

  } catch (err) {
    return createJsonResponse({
      status: "error",
      message: err.toString()
    });
  }
}

function doGet(e) {
  return createJsonResponse({
    status: "ok",
    service: "SFM Travels Google Sheets Live Connector",
    version: "1.0",
    time: new Date().toISOString()
  });
}

function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
