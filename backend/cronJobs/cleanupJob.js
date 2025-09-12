const cron = require("node-cron");
const Location = require("../model/LocationModel");

// Run every 2 minutes
cron.schedule("0 * * * *", async () => {
  console.log("Running activity log cleanup...");

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  try {
    const locations = await Location.find();
    let totalCleaned = 0;

    for (const loc of locations) {
      if (!loc.activityLog || loc.activityLog.length === 0) continue;

      const originalLength = loc.activityLog.length;


      // Filter activities: keep entries newer than 2 minutes OR the latest entry
      const filteredActivities = loc.activityLog.filter(activity => {
        const activityTime = new Date(activity.timestamp).getTime();
        // Keep if newer than 2 minutes ago OR if it's the latest entry
        return activityTime > oneHourAgo.getTime() ;
      });

      // Only save if there's a change
      if (filteredActivities.length !== originalLength) {
        loc.activityLog = filteredActivities;
        
        // Use markModified to ensure Mongoose knows the array has changed
        loc.markModified('activityLog');
        
        await loc.save();
        
        const cleaned = originalLength - filteredActivities.length;
        totalCleaned += cleaned;
        
        console.log(`Location "${loc.name}": Cleaned ${cleaned} old entries, kept ${filteredActivities.length}`);
      }
    }

    console.log(`✅ Cleanup complete. Total entries cleaned: ${totalCleaned}`);
  } catch (err) {
    console.error("❌ Cron job error:", err);
  }
});