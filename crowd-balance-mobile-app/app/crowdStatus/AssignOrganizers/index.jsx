import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { router, useLocalSearchParams } from "expo-router";

const AssignOrganizers = () => {
  const params = useLocalSearchParams();
  const [availableOrganizers, setAvailableOrganizers] = useState([]);
  const [assignedOrganizers, setAssignedOrganizers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [assignLoading, setAssignLoading] = useState(false);
  const [selectedOrganizer, setSelectedOrganizer] = useState(null);
  const [assignModalVisible, setAssignModalVisible] = useState(false);

  // API Base URLs
  const API_BASE_URL = "http://192.168.1.2:4000";
  const ORGANIZERS_API = `${API_BASE_URL}/users/organizers`;
  const LOCATIONS_API = `${API_BASE_URL}/locations`;

  // Location details from params
  const locationId = params.locationId;
  const locationName = params.locationName;
  const crowdLevel = params.crowdLevel;
  const locationCapacity = params.locationCapacity;

  // Auto-refresh interval (every 10 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData(false);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const fetchData = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }

    try {
      console.log("Fetching organizers and locations data...");

      // Fetch all organizers
      const organizersResponse = await fetch(`${ORGANIZERS_API}`);
      const organizersResult = await organizersResponse.json();
      
      console.log("Organizers API Response:", organizersResult);

      // Fetch all locations to check crowd levels and assignments
      const locationsResponse = await fetch(LOCATIONS_API);
      const locationsResult = await locationsResponse.json();
      
      console.log("Locations API Response:", locationsResult);

      // Handle organizers data
      let allOrganizers = [];
      if (organizersResult.organizers) {
        allOrganizers = organizersResult.organizers;
      } else if (organizersResult.success && organizersResult.data) {
        allOrganizers = organizersResult.data;
      } else if (Array.isArray(organizersResult)) {
        allOrganizers = organizersResult;
      }

      // Handle locations data
      let allLocations = [];
      if (locationsResult.success && locationsResult.data) {
        allLocations = locationsResult.data;
      } else if (locationsResult.locations) {
        allLocations = locationsResult.locations;
      } else if (Array.isArray(locationsResult)) {
        allLocations = locationsResult;
      }

      console.log("All organizers:", allOrganizers.length);
      console.log("All locations:", allLocations.length);

      // Filter Available Organizers
      // Criteria: userType == "Organizer", status == "Available", assignedHall == ""
      const availableOrganizersList = allOrganizers.filter(organizer => {
        const isOrganizer = organizer.userType === "Organizer";
        const isAvailable = organizer.status === "Available";
        const isNotAssigned = !organizer.assignedHall || organizer.assignedHall === "";
        
        console.log(`Organizer ${organizer.name}: isOrganizer=${isOrganizer}, isAvailable=${isAvailable}, isNotAssigned=${isNotAssigned}, assignedHall="${organizer.assignedHall}"`);
        
        return isOrganizer && isAvailable && isNotAssigned;
      });

      console.log("Filtered available organizers:", availableOrganizersList.length);
      setAvailableOrganizers(availableOrganizersList);

      // Filter Organizers in Low Crowd Areas
      // Criteria: assignedHall != "", assigned to a location with low crowd level
      const assignedOrganizersList = [];

      allOrganizers.forEach(organizer => {
        // Check if organizer is assigned (has assignedHall) and not busy
        if (organizer.assignedHall && 
            organizer.assignedHall !== "" && 
            organizer.status !== "Busy" && 
            organizer.userType === "Organizer") {
          
          // Find the location this organizer is assigned to
          const assignedLocation = allLocations.find(location => 
            location.name === organizer.assignedHall || 
            location._id === organizer.assignedHall ||
            (location.assignedOrganizers && 
             location.assignedOrganizers.some(assignedOrg => assignedOrg._id === organizer._id))
          );

          if (assignedLocation) {
            // Check if the assigned location has low crowd level
            // This depends on how crowd level is determined in your system
            const isLowCrowd = checkIfLocationHasLowCrowd(assignedLocation);
            
            if (isLowCrowd) {
              assignedOrganizersList.push({
                ...organizer,
                assignedLocation: assignedLocation.name,
                assignedLocationId: assignedLocation._id,
                currentCrowdLevel: getCurrentCrowdLevel(assignedLocation)
              });
            }
          }
        }
      });

      console.log("Organizers in low crowd areas:", assignedOrganizersList.length);
      setAssignedOrganizers(assignedOrganizersList);

    } catch (error) {
      console.error("Error fetching data:", error);
      Alert.alert("Error", "Failed to fetch organizer data. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Helper function to determine if a location has low crowd
  const checkIfLocationHasLowCrowd = (location) => {
    // Method 1: Check if there's a currentCrowdLevel field
    if (location.currentCrowdLevel) {
      return location.currentCrowdLevel === "Low Crowd" || location.currentCrowdLevel === "min";
    }

    // Method 2: Check if there's a crowdLevel field
    if (location.crowdLevel) {
      return location.crowdLevel === "min" || location.crowdLevel === "Low Crowd";
    }

    // Method 3: Calculate from recent activities (if available)
    if (location.activities && location.activities.length > 0) {
      const recentActivities = location.activities.slice(-5); // Last 5 activities
      const lowCrowdCount = recentActivities.filter(activity => 
        activity.crowdLevel === "min"
      ).length;
      return lowCrowdCount > recentActivities.length / 2; // Majority low crowd
    }

    // Method 4: Check crowd scores (if available)
    if (location.minCrowdScore !== undefined && location.moderateCrowdScore !== undefined && location.maxCrowdScore !== undefined) {
      const total = location.minCrowdScore + location.moderateCrowdScore + location.maxCrowdScore;
      if (total > 0) {
        return location.minCrowdScore >= location.moderateCrowdScore && location.minCrowdScore >= location.maxCrowdScore;
      }
    }

    // Default: assume not low crowd if we can't determine
    return false;
  };

  // Helper function to get current crowd level for display
  const getCurrentCrowdLevel = (location) => {
    if (location.currentCrowdLevel) {
      return location.currentCrowdLevel;
    }
    if (location.crowdLevel === "min") {
      return "Low Crowd";
    }
    if (location.crowdLevel === "moderate") {
      return "Moderate Crowd";
    }
    if (location.crowdLevel === "max") {
      return "High Crowd";
    }
    return "Unknown";
  };

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData(false);
  };

  const handleAssignOrganizer = async (organizer) => {
    setSelectedOrganizer(organizer);
    setAssignModalVisible(true);
  };

  const confirmAssignment = async () => {
    if (!selectedOrganizer || !locationId) return;

    setAssignLoading(true);
    try {
      const response = await fetch(`${ORGANIZERS_API}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizerId: selectedOrganizer._id,
          locationId: locationId,
          locationName: locationName
        }),
      });
      console.log("Assignmend rendered...");

      const result = await response.json();
      console.log("Assignment result:", result);
      
      if (result.success || result.message === "success" || response.ok) {
        Alert.alert(
          "Success", 
          `${selectedOrganizer.name} has been assigned to ${locationName}`,
          [
            {
              text: "OK",
              onPress: () => {
                setAssignModalVisible(false);
                setSelectedOrganizer(null);
                fetchData(); // Refresh data
              }
            }
          ]
        );
      } else {
        Alert.alert("Error", result.message || "Failed to assign organizer");
      }
    } catch (error) {
      console.error("Error assigning organizer:", error);
      Alert.alert("Error", "Failed to assign organizer. Please try again.");
    } finally {
      setAssignLoading(false);
    }
  };

  const handleUnassignOrganizer = async (organizer) => {
    Alert.alert(
      "Confirm Unassignment",
      `Are you sure you want to unassign ${organizer.name} from ${organizer.assignedLocation}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unassign",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await fetch(`${ORGANIZERS_API}/unassign`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  organizerId: organizer._id,
                  locationId: organizer.assignedLocationId
                }),
              });

              const result = await response.json();
              console.log("Unassignment result:", result);
              
              if (result.success || result.message === "success" || response.ok) {
                Alert.alert("Success", `${organizer.name} has been unassigned`);
                fetchData(); // Refresh data
              } else {
                Alert.alert("Error", result.message || "Failed to unassign organizer");
              }
            } catch (error) {
              console.error("Error unassigning organizer:", error);
              Alert.alert("Error", "Failed to unassign organizer. Please try again.");
            }
          }
        }
      ]
    );
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'available':
        return '#4CAF50';
      case 'assigned':
        return '#FF9800';
      case 'busy':
        return '#F44336';
      default:
        return '#999';
    }
  };

  const getCrowdLevelColor = (level) => {
    switch (level) {
      case 'Low Crowd':
        return '#4CAF50';
      case 'Moderate Crowd':
        return '#FF9800';
      case 'High Crowd':
        return '#F44336';
      default:
        return '#999';
    }
  };

  const renderAvailableOrganizer = (organizer, index) => (
    <View key={organizer._id || index} style={styles.organizerCard}>
      <View style={styles.organizerHeader}>
        <View style={styles.organizerInfo}>
          <Text style={styles.organizerName}>{organizer.name}</Text>
          <Text style={styles.organizerEmail}>{organizer.email}</Text>
          <Text style={styles.organizerPhone}>{organizer.phone}</Text>
          <Text style={styles.organizerType}>Type: {organizer.userType}</Text>
        </View>
        <View style={styles.organizerActions}>
          <View style={[
            styles.statusBadge, 
            { backgroundColor: getStatusColor(organizer.status) }
          ]}>
            <Text style={styles.statusText}>{organizer.status}</Text>
          </View>
          <TouchableOpacity
            style={styles.assignButton}
            onPress={() => handleAssignOrganizer(organizer)}
          >
            <Icon name="person-add" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderAssignedOrganizer = (organizer, index) => (
    <View key={organizer._id || index} style={styles.assignedOrganizerCard}>
      <View style={styles.organizerHeader}>
        <View style={styles.organizerInfo}>
          <Text style={styles.organizerName}>{organizer.name}</Text>
          <Text style={styles.organizerEmail}>{organizer.email}</Text>
          <Text style={styles.organizerPhone}>{organizer.phone}</Text>
          <View style={styles.assignmentInfo}>
            <Icon name="location-on" size={16} color="#007AFF" />
            <Text style={styles.assignedLocationText}>
              Assigned to: {organizer.assignedLocation}
            </Text>
          </View>
          <View style={styles.crowdInfo}>
            <Icon name="trending-down" size={16} color="#4CAF50" />
            <Text style={styles.crowdText}>
              Current crowd: {organizer.currentCrowdLevel}
            </Text>
          </View>
        </View>
        <View style={styles.organizerActions}>
          <TouchableOpacity
            style={styles.unassignButton}
            onPress={() => handleUnassignOrganizer(organizer)}
          >
            <Icon name="person-remove" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading organizer data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Icon name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.header}>Assign Organizers</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
          <Icon name="refresh" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Location Info Card */}
        <View style={styles.locationInfoCard}>
          <View style={styles.locationHeader}>
            <Text style={styles.locationTitle}>Current Location</Text>
            <View style={[
              styles.crowdBadge, 
              { backgroundColor: getCrowdLevelColor(crowdLevel) }
            ]}>
              <Text style={styles.crowdBadgeText}>{crowdLevel}</Text>
            </View>
          </View>
          <Text style={styles.locationName}>{locationName}</Text>
          <Text style={styles.locationDetails}>Capacity: {locationCapacity} people</Text>
          <Text style={styles.locationId}>ID: {locationId}</Text>
        </View>

        {/* Auto-refresh indicator */}
        <View style={styles.autoRefreshIndicator}>
          <Icon name="autorenew" size={16} color="#007AFF" />
          <Text style={styles.autoRefreshText}>Auto-refreshing every 10 seconds</Text>
        </View>

        {/* Available Organizers Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Icon name="people" size={24} color="#4CAF50" />
            <Text style={styles.sectionTitle}>Available Organizers</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{availableOrganizers.length}</Text>
            </View>
          </View>
          <Text style={styles.sectionSubtitle}>
            Organizers with "Available" status and not currently assigned to any location
          </Text>
          
          {availableOrganizers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="person-off" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No available organizers</Text>
              <Text style={styles.emptySubtext}>
                All organizers are either busy or already assigned to locations
              </Text>
            </View>
          ) : (
            availableOrganizers.map((organizer, index) => 
              renderAvailableOrganizer(organizer, index)
            )
          )}
        </View>

        {/* Assigned Organizers in Low Crowd Locations */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Icon name="assignment-ind" size={24} color="#FF9800" />
            <Text style={styles.sectionTitle}>Organizers in Low Crowd Areas</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{assignedOrganizers.length}</Text>
            </View>
          </View>
          <Text style={styles.sectionSubtitle}>
            Organizers currently assigned to locations with low crowd levels - available for reassignment
          </Text>
          
          {assignedOrganizers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="assignment" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No organizers in low crowd areas</Text>
              <Text style={styles.emptySubtext}>
                All assigned organizers are in high-priority locations or no assignments exist
              </Text>
            </View>
          ) : (
            assignedOrganizers.map((organizer, index) => 
              renderAssignedOrganizer(organizer, index)
            )
          )}
        </View>
      </ScrollView>

      {/* Assignment Confirmation Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={assignModalVisible}
        onRequestClose={() => setAssignModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirm Assignment</Text>
            
            {selectedOrganizer && (
              <View style={styles.modalBody}>
                <Text style={styles.modalText}>
                  Assign <Text style={styles.boldText}>{selectedOrganizer.name}</Text> to:
                </Text>
                <Text style={styles.modalLocationText}>{locationName}</Text>
                <Text style={styles.modalDetails}>
                  Current crowd level: <Text style={[styles.boldText, { color: getCrowdLevelColor(crowdLevel) }]}>
                    {crowdLevel}
                  </Text>
                </Text>
              </View>
            )}
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setAssignModalVisible(false)}
                disabled={assignLoading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.confirmButton, assignLoading && styles.disabledButton]}
                onPress={confirmAssignment}
                disabled={assignLoading}
              >
                {assignLoading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Icon name="check" size={20} color="white" />
                    <Text style={styles.confirmButtonText}>Assign</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#007AFF",
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backButton: {
    marginRight: 15,
  },
  refreshButton: {
    marginLeft: 15,
  },
  header: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
    flex: 1,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  scrollContainer: {
    flex: 1,
    padding: 15,
  },
  locationInfoCard: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
    marginBottom: 15,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  locationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  crowdBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  crowdBadgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  locationName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  locationDetails: {
    fontSize: 16,
    color: "#666",
    marginBottom: 5,
  },
  locationId: {
    fontSize: 12,
    color: "#999",
    fontFamily: "monospace",
  },
  autoRefreshIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    marginBottom: 15,
  },
  autoRefreshText: {
    marginLeft: 5,
    fontSize: 12,
    color: "#007AFF",
  },
  sectionCard: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
    marginBottom: 15,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginLeft: 10,
    flex: 1,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 15,
    marginTop: -10,
  },
  countBadge: {
    backgroundColor: "#007AFF",
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  countText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  organizerCard: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    backgroundColor: "#fafafa",
  },
  assignedOrganizerCard: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    backgroundColor: "#fff3e0",
  },
  organizerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  organizerInfo: {
    flex: 1,
  },
  organizerName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  organizerEmail: {
    fontSize: 14,
    color: "#666",
    marginBottom: 3,
  },
  organizerPhone: {
    fontSize: 14,
    color: "#666",
    marginBottom: 3,
  },
  organizerType: {
    fontSize: 12,
    color: "#888",
    marginBottom: 8,
  },
  assignmentInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },
  assignedLocationText: {
    fontSize: 12,
    color: "#007AFF",
    marginLeft: 5,
    fontWeight: "500",
  },
  crowdInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
  },
  crowdText: {
    fontSize: 12,
    color: "#4CAF50",
    marginLeft: 5,
    fontWeight: "500",
  },
  organizerActions: {
    alignItems: "flex-end",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 8,
  },
  statusText: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
  },
  assignButton: {
    backgroundColor: "#4CAF50",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  unassignButton: {
    backgroundColor: "#F44336",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 30,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    marginTop: 10,
    marginBottom: 5,
  },
  emptySubtext: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 20,
    width: "90%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
    marginBottom: 20,
  },
  modalBody: {
    marginBottom: 25,
  },
  modalText: {
    fontSize: 16,
    color: "#333",
    textAlign: "center",
    marginBottom: 10,
  },
  modalLocationText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#007AFF",
    textAlign: "center",
    marginBottom: 10,
  },
  modalDetails: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  boldText: {
    fontWeight: "bold",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#f0f0f0",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginRight: 10,
  },
  cancelButtonText: {
    fontSize: 16,
    color: "#666",
    fontWeight: "600",
  },
  confirmButton: {
    flex: 1,
    backgroundColor: "#4CAF50",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginLeft: 10,
  },
  confirmButtonText: {
    fontSize: 16,
    color: "white",
    fontWeight: "600",
    marginLeft: 5,
  },
  disabledButton: {
    opacity: 0.6,
  },
});

export default AssignOrganizers;