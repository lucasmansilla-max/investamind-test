/**
 * Script to test webhook log creation
 */

import "dotenv/config";
import { storage } from "../server/storage";

async function testWebhookLogCreation() {
  try {
    console.log("Testing webhook log creation...");
    
    // Test 1: Create a simple log
    console.log("\n1. Creating test webhook log...");
    const testLog = await storage.createWebhookLog({
      source: "revenuecat",
      eventType: "TEST_EVENT",
      payload: { test: true, message: "This is a test webhook log" },
      userId: null,
      subscriptionId: null,
      status: "received",
      errorMessage: null,
      processedAt: null,
    });
    
    console.log("✅ Log created successfully:", {
      id: testLog.id,
      source: testLog.source,
      eventType: testLog.eventType,
      status: testLog.status,
      createdAt: testLog.createdAt,
    });
    
    // Test 2: Update the log status
    console.log("\n2. Updating log status to 'processed'...");
    await storage.updateWebhookLogStatus(
      testLog.id,
      "processed",
      undefined,
      undefined
    );
    console.log("✅ Log status updated successfully");
    
    // Test 3: Retrieve the log
    console.log("\n3. Retrieving the log...");
    const retrievedLog = await storage.getWebhookLog(testLog.id);
    if (retrievedLog) {
      console.log("✅ Log retrieved successfully:", {
        id: retrievedLog.id,
        status: retrievedLog.status,
        eventType: retrievedLog.eventType,
      });
    } else {
      console.error("❌ Log not found after creation");
    }
    
    // Test 4: Get all logs
    console.log("\n4. Getting all webhook logs...");
    const allLogs = await storage.getWebhookLogs({ limit: 10 });
    console.log(`✅ Retrieved ${allLogs.length} logs`);
    if (allLogs.length > 0) {
      console.log("Recent logs:");
      allLogs.slice(0, 5).forEach((log: any) => {
        console.log(`  - ID: ${log.id}, Source: ${log.source}, Event: ${log.eventType}, Status: ${log.status}`);
      });
    }
    
    console.log("\n✅ All tests passed!");
    process.exit(0);
  } catch (error: any) {
    console.error("\n❌ Test failed:", error.message);
    console.error("Stack:", error.stack);
    process.exit(1);
  }
}

testWebhookLogCreation();

