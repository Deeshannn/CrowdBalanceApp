const Location = require('../model/LocationModel');

// Get all locations
const getAllLocations = async (req, res) => {
  try {
    const locations = await Location.find({ isActive: true });
    res.status(200).json({
      success: true,
      data: locations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching locations',
      error: error.message
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
        message: 'Location not found'
      });
    }
    res.status(200).json({
      success: true,
      data: location
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching location',
      error: error.message
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
        message: 'Name and capacity are required'
      });
    }

    const newLocation = new Location({
      name,
      capacity,
      maxCrowdScore: 0,
      moderateCrowdScore: 0,
      minCrowdScore: 0
    });

    const savedLocation = await newLocation.save();
    res.status(201).json({
      success: true,
      message: 'Location added successfully',
      data: savedLocation
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Location name already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error adding location',
      error: error.message
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

    if (!['min', 'moderate', 'max'].includes(crowdLevel)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid crowd level. Use: min, moderate, or max'
      });
    }

    const location = await Location.findById(locationId);
    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Location not found'
      });
    }

    // Update the corresponding score
    switch (crowdLevel) {
      case 'min':
        location.minCrowdScore += 1;
        break;
      case 'moderate':
        location.moderateCrowdScore += 1;
        break;
      case 'max':
        location.maxCrowdScore += 1;
        break;
    }

    // Add activity and clean old entries (using the schema method)
    await location.addActivity(crowdLevel);

    res.status(200).json({
      success: true,
      message: `${crowdLevel} crowd score updated successfully`,
      data: location
    });
  } catch (error) {
    console.error('Error updating crowd score:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating crowd score',
      error: error.message
    });
  }
};

// NEW FUNCTION: Get recent activities for a location
const getLocationActivities = async (req, res) => {
  try {
    const { locationId } = req.params;

    const location = await Location.findById(locationId);
    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Location not found'
      });
    }

    const recentActivities = location.getRecentActivities();

    res.status(200).json({
      success: true,
      data: {
        locationName: location.name,
        activities: recentActivities,
        lastUpdated: location.lastUpdated
      }
    });

  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching activities',
      error: error.message
    });
  }
};

// Update location details (Main Panel only)
const updateLocation = async (req, res) => {
  try {
    const { locationId } = req.params;
    const updates = req.body;

    const location = await Location.findByIdAndUpdate(
      locationId,
      updates,
      { new: true, runValidators: true }
    );

    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Location not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Location updated successfully',
      data: location
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating location',
      error: error.message
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
        message: 'Location not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Location deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting location',
      error: error.message
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
  getLocationActivities  // NEW EXPORT
};