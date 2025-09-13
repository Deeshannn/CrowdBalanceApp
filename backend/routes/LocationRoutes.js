const express = require('express');
const router = express.Router();
const locationController = require('../controllers/LocationController');

// Get all locations
router.get('/', locationController.getAllLocations);

// Add new location (Main Panel only) - PUT THIS BEFORE /:id routes
router.post('/', locationController.addLocation);

// Update crowd score (Organizers only) - PUT THIS BEFORE /:id routes
router.patch('/:locationId/crowd', locationController.updateCrowdScore);

// NEW ROUTE: Get recent activities for a location
router.get('/:locationId/activities', locationController.getLocationActivities);

// Get single location by ID
router.get('/:locationId', locationController.getLocationById);

// Update location details (Main Panel only)
router.put('/:locationId', locationController.updateLocation);


router.get("/:locationId/organizers", locationController.getLocationByIdOrganizers);

// Delete location (Main Panel only)
// router.delete('/:locationId', locationController.deleteLocation);

module.exports = router;