const Location = require("../model/LocationModel");

// Helper function to calculate scores from activity log
const calculateScoresFromActivityLog = (activityLog) => {
  if (!activityLog || activityLog.length === 0) {
    return {
      minCrowdScore: 0,
      moderateCrowdScore: 0,
      maxCrowdScore: 0,
      total: 0,
    };
  }

  const scores = activityLog.reduce(
    (acc, activity) => {
      switch (activity.crowdLevel) {
        case "min":
          acc.minCrowdScore += 1;
          break;
        case "moderate":
          acc.moderateCrowdScore += 1;
          break;
        case "max":
          acc.maxCrowdScore += 1;
          break;
      }
      return acc;
    },
    { minCrowdScore: 0, moderateCrowdScore: 0, maxCrowdScore: 0 }
  );

  return {
    ...scores,
    total:
      scores.minCrowdScore + scores.moderateCrowdScore + scores.maxCrowdScore,
  };
};

// Helper function to calculate scores from activity log for a specific time period
const calculateScoresFromActivityLogForPeriod = (activityLog, hours = null) => {
  if (!activityLog || activityLog.length === 0) {
    return {
      minCrowdScore: 0,
      moderateCrowdScore: 0,
      maxCrowdScore: 0,
      total: 0,
    };
  }

  let filteredActivities = activityLog;

  // If hours specified, filter activities within that time period
  if (hours !== null) {
    const timeAgo = new Date(Date.now() - hours * 60 * 60 * 1000);
    filteredActivities = activityLog.filter(
      (activity) => new Date(activity.timestamp) >= timeAgo
    );
  }

  const scores = filteredActivities.reduce(
    (acc, activity) => {
      switch (activity.crowdLevel) {
        case "min":
          acc.minCrowdScore += 1;
          break;
        case "moderate":
          acc.moderateCrowdScore += 1;
          break;
        case "max":
          acc.maxCrowdScore += 1;
          break;
      }
      return acc;
    },
    { minCrowdScore: 0, moderateCrowdScore: 0, maxCrowdScore: 0 }
  );

  return {
    ...scores,
    total:
      scores.minCrowdScore + scores.moderateCrowdScore + scores.maxCrowdScore,
  };
};

// Get all locations
const getAllLocations = async (req, res) => {
  try {
    const locations = await Location.find({ isActive: true });

    // Calculate scores from activity log for each location
    const locationsWithCalculatedScores = locations.map((location) => {
      const calculatedScores = calculateScoresFromActivityLog(
        location.activityLog
      );
      const lastHourScores = calculateScoresFromActivityLogForPeriod(
        location.activityLog,
        1
      );

      return {
        ...location.toObject(),
        // Replace database scores with calculated scores
        minCrowdScore: calculatedScores.minCrowdScore,
        moderateCrowdScore: calculatedScores.moderateCrowdScore,
        maxCrowdScore: calculatedScores.maxCrowdScore,
        totalScore: calculatedScores.total,
        // Add last hour scores for additional info
        lastHourScores: lastHourScores,
      };
    });

    res.status(200).json({
      success: true,
      data: locationsWithCalculatedScores,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching locations",
      error: error.message,
    });
  }
};

// Get single location
const getLocationById = async (req, res) => {
  try {
    const location = await Location.findById(req.params.locationId);
    if (!location) {
      return res.status(404).json({
        success: false,
        message: "Location not found",
      });
    }

    // Calculate scores from activity log
    const calculatedScores = calculateScoresFromActivityLog(
      location.activityLog
    );
    const lastHourScores = calculateScoresFromActivityLogForPeriod(
      location.activityLog,
      1
    );

    const locationWithCalculatedScores = {
      ...location.toObject(),
      minCrowdScore: calculatedScores.minCrowdScore,
      moderateCrowdScore: calculatedScores.moderateCrowdScore,
      maxCrowdScore: calculatedScores.maxCrowdScore,
      totalScore: calculatedScores.total,
      lastHourScores: lastHourScores,
    };

    res.status(200).json({
      success: true,
      data: locationWithCalculatedScores,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching location",
      error: error.message,
    });
  }
};

// Add new location (Main Panel only)
const addLocation = async (req, res) => {
  try {
    const { name, capacity } = req.body;

    if (!name || !capacity) {
      return res.status(400).json({
        success: false,
        message: "Name and capacity are required",
      });
    }

    const newLocation = new Location({
      name,
      capacity,
      maxCrowdScore: 0,
      moderateCrowdScore: 0,
      minCrowdScore: 0,
      activityLog: [], // Initialize empty activity log
    });

    const savedLocation = await newLocation.save();
    res.status(201).json({
      success: true,
      message: "Location added successfully",
      data: savedLocation,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Location name already exists",
      });
    }
    res.status(500).json({
      success: false,
      message: "Error adding location",
      error: error.message,
    });
  }
};

// Update crowd score (Organizers only) - UPDATED WITH ACTIVITY TRACKING
const updateCrowdScore = async (req, res) => {
  console.log("location id is: " + req.params.locationId);
  console.log(req.body);

  try {
    const { locationId } = req.params;
    const { crowdLevel } = req.body; // 'min', 'moderate', 'max'

    if (!["min", "moderate", "max"].includes(crowdLevel)) {
      return res.status(400).json({
        success: false,
        message: "Invalid crowd level. Use: min, moderate, or max",
      });
    }

    const location = await Location.findById(locationId);
    if (!location) {
      return res.status(404).json({
        success: false,
        message: "Location not found",
      });
    }

    // Add new activity to activity log
    const newActivity = {
      crowdLevel: crowdLevel,
      timestamp: new Date(),
      organizerId: "organizer", // You might want to get this from auth token
    };

    // Add to activity log
    location.activityLog.push(newActivity);

    // Update lastUpdated
    location.lastUpdated = new Date();

    // ✅ Remove activities older than 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    location.activityLog = location.activityLog.filter(
      (activity) => new Date(activity.timestamp) >= oneHourAgo
    );

    // Save the location
    await location.save();

    // Calculate new scores from activity log
    const calculatedScores = calculateScoresFromActivityLog(
      location.activityLog
    );

    // Return location with calculated scores
    const locationWithCalculatedScores = {
      ...location.toObject(),
      minCrowdScore: calculatedScores.minCrowdScore,
      moderateCrowdScore: calculatedScores.moderateCrowdScore,
      maxCrowdScore: calculatedScores.maxCrowdScore,
      totalScore: calculatedScores.total,
    };

    res.status(200).json({
      success: true,
      message: `${crowdLevel} crowd score updated successfully`,
      data: locationWithCalculatedScores,
    });
  } catch (error) {
    console.error("Error updating crowd score:", error);
    res.status(500).json({
      success: false,
      message: "Error updating crowd score",
      error: error.message,
    });
  }
};

// Get recent activities for a location
const getLocationActivities = async (req, res) => {
  try {
    const { locationId } = req.params;

    const location = await Location.findById(locationId);
    if (!location) {
      return res.status(404).json({
        success: false,
        message: "Location not found",
      });
    }

    // Calculate scores from activity log
    const calculatedScores = calculateScoresFromActivityLog(
      location.activityLog
    );
    const lastHourScores = calculateScoresFromActivityLogForPeriod(
      location.activityLog,
      1
    );

    res.status(200).json({
      success: true,
      data: {
        locationName: location.name,
        activities: location.activityLog || [],
        calculatedScores: calculatedScores,
        lastHourScores: lastHourScores,
        lastUpdated: location.lastUpdated,
      },
    });
  } catch (error) {
    console.error("Error fetching activities:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching activities",
      error: error.message,
    });
  }
};

// Update location details (Main Panel only)
const updateLocation = async (req, res) => {
  try {
    const { locationId } = req.params;
    const updates = req.body;

    const location = await Location.findByIdAndUpdate(locationId, updates, {
      new: true,
      runValidators: true,
    });

    if (!location) {
      return res.status(404).json({
        success: false,
        message: "Location not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Location updated successfully",
      data: location,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating location",
      error: error.message,
    });
  }
};

// Delete location (Main Panel only)
const deleteLocation = async (req, res) => {
  try {
    const { locationId } = req.params;

    const location = await Location.findByIdAndUpdate(
      locationId,
      { isActive: false },
      { new: true }
    );

    if (!location) {
      return res.status(404).json({
        success: false,
        message: "Location not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Location deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting location",
      error: error.message,
    });
  }
};

module.exports = {
  getAllLocations,
  getLocationById,
  addLocation,
  updateCrowdScore,
  updateLocation,
  deleteLocation,
  getLocationActivities,
};
