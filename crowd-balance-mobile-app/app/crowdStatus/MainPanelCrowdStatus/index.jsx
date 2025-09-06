import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { router } from "expo-router";

const MainPanelScreen = () => {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [newLocationName, setNewLocationName] = useState("");
  const [newLocationCapacity, setNewLocationCapacity] = useState("");

  // API Base URL - Replace with your actual API URL
  const API_BASE_URL = "http://192.168.1.2:4000/locations";

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const response = await fetch(API_BASE_URL);
      const result = await response.json();

      if (result.success) {
        // Process each location to get last hour activities
        const locationsWithActivities = await Promise.all(
          result.data.map(async (location) => {
            try {
              const activitiesResponse = await fetch(
                `${API_BASE_URL}/${location._id}/activities`
              );
              const activitiesResult = await activitiesResponse.json();

              if (activitiesResult.success) {
                const activities = activitiesResult.data.activities || [];
                
                // Calculate crowd scores based on last hour activities
                const crowdScores = calculateLastHourCrowdScores(activities);
                
                return {
                  ...location,
                  lastHourActivities: activities,
                  lastHourCrowdScores: crowdScores,
                };
              }
              
              return {
                ...location,
                lastHourActivities: [],
                lastHourCrowdScores: { min: 0, moderate: 0, max: 0 },
              };
            } catch (error) {
              console.error(`Error fetching activities for ${location.name}:`, error);
              return {
                ...location,
                lastHourActivities: [],
                lastHourCrowdScores: { min: 0, moderate: 0, max: 0 },
              };
            }
          })
        );

        setLocations(locationsWithActivities);
      } else {
        Alert.alert("Error", "Failed to fetch locations");
      }
    } catch (error) {
      Alert.alert("Error", "Network error occurred");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calculateLastHourCrowdScores = (activities) => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    // Filter activities from the last hour
    const recentActivities = activities.filter(activity => {
      const activityTime = new Date(activity.timestamp);
      return activityTime >= oneHourAgo;
    });

    // Count occurrences of each crowd level
    const scores = { min: 0, moderate: 0, max: 0 };
    
    recentActivities.forEach(activity => {
      if (activity.crowdLevel === 'min') {
        scores.min += 1;
      } else if (activity.crowdLevel === 'moderate') {
        scores.moderate += 1;
      } else if (activity.crowdLevel === 'max') {
        scores.max += 1;
      }
    });

    return scores;
  };

  const addNewLocation = async () => {
    if (!newLocationName.trim() || !newLocationCapacity.trim()) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (
      isNaN(parseInt(newLocationCapacity)) ||
      parseInt(newLocationCapacity) < 1
    ) {
      Alert.alert("Error", "Capacity must be a valid number greater than 0");
      return;
    }

    try {
      const response = await fetch(API_BASE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newLocationName.trim(),
          capacity: parseInt(newLocationCapacity),
        }),
      });

      const result = await response.json();

      if (result.success) {
        Alert.alert("Success", "Location added successfully!");
        setModalVisible(false);
        setNewLocationName("");
        setNewLocationCapacity("");
        fetchLocations(); // Refresh the list
      } else {
        Alert.alert("Error", result.message);
      }
    } catch (error) {
      Alert.alert("Error", "Network error occurred");
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchLocations();
  };

  const handleLocationPress = (item) => {
    console.log("Handling Navigation...");
    try {
      // Fixed navigation for Expo Router
      console.log("Trying Handling Navigation...");

      router.push({
        pathname: "./LocationDetails",
        params: {
          locationData: JSON.stringify({
            _id: item._id,
            name: item.name,
            capacity: item.capacity,
            minCrowdScore: item.minCrowdScore,
            moderateCrowdScore: item.moderateCrowdScore,
            maxCrowdScore: item.maxCrowdScore,
          }),
        },
      });
    } catch (error) {
      console.error("Navigation error:", error);
      Alert.alert("Error", "Unable to navigate to location details");
    }
  };

  const getCrowdLevel = (location) => {
    const { lastHourCrowdScores } = location;
    const total = lastHourCrowdScores.min + lastHourCrowdScores.moderate + lastHourCrowdScores.max;

    if (total === 0) return { level: "No Recent Data", color: "#999", percentage: 0 };

    if (lastHourCrowdScores.max >= lastHourCrowdScores.moderate && lastHourCrowdScores.max >= lastHourCrowdScores.min) {
      return {
        level: "High Crowd",
        color: "#F44336",
        percentage: Math.round((lastHourCrowdScores.max / total) * 100),
      };
    } else if (lastHourCrowdScores.moderate >= lastHourCrowdScores.min) {
      return {
        level: "Moderate Crowd",
        color: "#FF9800",
        percentage: Math.round((lastHourCrowdScores.moderate / total) * 100),
      };
    } else {
      return {
        level: "Low Crowd",
        color: "#4CAF50",
        percentage: Math.round((lastHourCrowdScores.min / total) * 100),
      };
    }
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now - time) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    return `${Math.floor(diffInMinutes / 60)}h ${diffInMinutes % 60}m ago`;
  };

  const renderCrowdChart = (location) => {
    const { lastHourCrowdScores } = location;
    const total = lastHourCrowdScores.min + lastHourCrowdScores.moderate + lastHourCrowdScores.max;

    if (total === 0) {
      return (
        <View style={styles.chartContainer}>
          <Text style={styles.noDataText}>No updates in the last hour</Text>
          <Text style={styles.noDataSubtext}>Waiting for crowd level reports...</Text>
        </View>
      );
    }

    const minPercentage = (lastHourCrowdScores.min / total) * 100;
    const moderatePercentage = (lastHourCrowdScores.moderate / total) * 100;
    const maxPercentage = (lastHourCrowdScores.max / total) * 100;

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Last Hour Activity ({total} reports)</Text>

        <View style={styles.chartBar}>
          <View
            style={[
              styles.chartSegment,
              {
                width: `${minPercentage}%`,
                backgroundColor: "#4CAF50",
              },
            ]}
          />
          <View
            style={[
              styles.chartSegment,
              {
                width: `${moderatePercentage}%`,
                backgroundColor: "#FF9800",
              },
            ]}
          />
          <View
            style={[
              styles.chartSegment,
              {
                width: `${maxPercentage}%`,
                backgroundColor: "#F44336",
              },
            ]}
          />
        </View>

        <View style={styles.chartLegend}>
          <View style={styles.legendItem}>
            <View
              style={[styles.legendColor, { backgroundColor: "#4CAF50" }]}
            />
            <Text style={styles.legendText}>
              Low ({lastHourCrowdScores.min})
            </Text>
          </View>
          <View style={styles.legendItem}>
            <View
              style={[styles.legendColor, { backgroundColor: "#FF9800" }]}
            />
            <Text style={styles.legendText}>
              Moderate ({lastHourCrowdScores.moderate})
            </Text>
          </View>
          <View style={styles.legendItem}>
            <View
              style={[styles.legendColor, { backgroundColor: "#F44336" }]}
            />
            <Text style={styles.legendText}>
              High ({lastHourCrowdScores.max})
            </Text>
          </View>
        </View>

        {/* Show most recent update time */}
        {location.lastHourActivities.length > 0 && (
          <View style={styles.lastUpdateContainer}>
            <Text style={styles.lastUpdateText}>
              Last update: {formatTimeAgo(location.lastHourActivities[0].timestamp)}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderLocationItem = ({ item }) => {
    const crowdInfo = getCrowdLevel(item);
    const totalReports = item.lastHourCrowdScores.min + item.lastHourCrowdScores.moderate + item.lastHourCrowdScores.max;

    return (
      <TouchableOpacity
        style={styles.locationCard}
        onPress={() => handleLocationPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.locationHeader}>
          <Text style={styles.locationName}>{item.name}</Text>
          <View style={styles.rightSection}>
            <View
              style={[styles.statusBadge, { backgroundColor: crowdInfo.color }]}
            >
              <Text style={styles.statusText}>{crowdInfo.level}</Text>
            </View>
            <Icon
              name="chevron-right"
              size={24}
              color="#ccc"
              style={styles.chevronIcon}
            />
          </View>
        </View>

        <Text style={styles.locationCapacity}>
          Capacity: {item.capacity} people
        </Text>

        {renderCrowdChart(item)}

        <View style={styles.totalReports}>
          <Text style={styles.totalReportsText}>
            Reports in Last Hour: {totalReports}
          </Text>
          <Text style={styles.tapHint}>Tap to view detailed analytics</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading locations...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Live Crowd Monitoring</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <Icon name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={locations}
        renderItem={renderLocationItem}
        keyExtractor={(item) => item._id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
      />

      {/* Add Location Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Add New Location</Text>

            <TextInput
              style={styles.input}
              placeholder="Location Name"
              value={newLocationName}
              onChangeText={setNewLocationName}
            />

            <TextInput
              style={styles.input}
              placeholder="Capacity"
              value={newLocationCapacity}
              onChangeText={setNewLocationCapacity}
              keyboardType="numeric"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setModalVisible(false);
                  setNewLocationName("");
                  setNewLocationCapacity("");
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.addLocationButton]}
                onPress={addNewLocation}
              >
                <Text style={styles.addButtonText}>Add Location</Text>
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
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#007AFF",
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  header: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
    flex: 1,
  },
  addButton: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
    padding: 8,
  },
  listContainer: {
    padding: 10,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  locationCard: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 15,
    marginVertical: 8,
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
  locationName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
  },
  rightSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    marginRight: 8,
  },
  statusText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  chevronIcon: {
    marginLeft: 5,
  },
  locationCapacity: {
    fontSize: 14,
    color: "#666",
    marginBottom: 15,
  },
  chartContainer: {
    marginBottom: 15,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  chartBar: {
    flexDirection: "row",
    height: 10,
    backgroundColor: "#e0e0e0",
    borderRadius: 5,
    overflow: "hidden",
    marginBottom: 10,
  },
  chartSegment: {
    height: "100%",
  },
  chartLegend: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 5,
  },
  legendText: {
    fontSize: 11,
    color: "#666",
  },
  lastUpdateContainer: {
    backgroundColor: "#f0f8ff",
    padding: 8,
    borderRadius: 5,
    alignItems: "center",
  },
  lastUpdateText: {
    fontSize: 11,
    color: "#007AFF",
    fontWeight: "bold",
  },
  noDataText: {
    textAlign: "center",
    color: "#999",
    fontStyle: "italic",
    fontSize: 14,
    marginBottom: 4,
  },
  noDataSubtext: {
    textAlign: "center",
    color: "#ccc",
    fontSize: 12,
  },
  totalReports: {
    backgroundColor: "#f8f8f8",
    padding: 8,
    borderRadius: 5,
    alignItems: "center",
  },
  totalReportsText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "bold",
  },
  tapHint: {
    fontSize: 10,
    color: "#999",
    marginTop: 2,
    fontStyle: "italic",
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
    width: "90%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 5,
    alignItems: "center",
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: "#f0f0f0",
  },
  addLocationButton: {
    backgroundColor: "#007AFF",
  },
  cancelButtonText: {
    color: "#666",
    fontWeight: "bold",
  },
  addButtonText: {
    color: "white",
    fontWeight: "bold",
  },
});

export default MainPanelScreen;