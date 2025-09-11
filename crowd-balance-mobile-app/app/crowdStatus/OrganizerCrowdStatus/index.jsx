import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { API_BASE_URL } from "../../../config";

const OrganizerScreen = () => {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [scoreReductionStatus, setScoreReductionStatus] = useState(null);
  const refreshInterval = useRef(null);

  useEffect(() => {
    fetchLocations();
    fetchScoreReductionStatus();

    // Set up automatic refresh every 30 seconds to see real-time score changes
    refreshInterval.current = setInterval(() => {
      if (!refreshing && !loading) {
        fetchLocations();
      }
    }, 30000);

    return () => {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
      }
    };
  }, []);

  // Fetch score reduction status from backend
  // const fetchScoreReductionStatus = async () => {

  //   console.log("Trying to fetch the score reduction data...");

  //   try {
  //     console.log("Tryinf step 1");
  //     const response = await fetch(`${API_BASE_URL}/score-reduction/status`);
  //     console.log("Tryinf step 2");
  //     console.log("response " + response.data);

  //     const result = await response.json();
  //     console.log("Tryinf step 3");

  //     if (result.success) {
  //       setScoreReductionStatus(result.data);
  //     }
  //   } catch (error) {
  //     console.error('Error fetching score reduction status:', error);
  //   }
  // };
  const fetchScoreReductionStatus = async () => {
    console.log("Trying to fetch the score reduction data...");

    try {
      const response = await fetch(`${API_BASE_URL}/`);
      console.log("Response status:", response.status);
      console.log(
        "Response headers:",
        Object.fromEntries([...response.headers])
      );

      // Check what type of content we're getting
      const responseText = await response.text();
      console.log("Raw response:", responseText.substring(0, 200)); // First 200 chars

      // Only try to parse as JSON if it looks like JSON
      if (
        responseText.trim().startsWith("{") ||
        responseText.trim().startsWith("[")
      ) {
        const result = JSON.parse(responseText);
        if (result.success) {
          setScoreReductionStatus(result.data);
        }
      } else {
        console.error("Server returned non-JSON response:", responseText);
      }
    } catch (error) {
      console.error("Error fetching score reduction status:", error);
    }
  };

  // Calculate crowd data for the last hour only (for display purposes)
  const getLastHourCrowdData = (activities) => {
    if (!activities || activities.length === 0) {
      return {
        minCrowdScore: 0,
        moderateCrowdScore: 0,
        maxCrowdScore: 0,
        total: 0,
      };
    }

    // Filter activities from the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const lastHourActivities = activities.filter(
      (activity) => new Date(activity.timestamp) >= oneHourAgo
    );

    const counts = lastHourActivities.reduce(
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
      ...counts,
      total:
        counts.minCrowdScore + counts.moderateCrowdScore + counts.maxCrowdScore,
    };
  };

  // Get the current dominant crowd level based on database scores (not filtered)
  const getCurrentCrowdLevel = (location) => {
    const { minCrowdScore, moderateCrowdScore, maxCrowdScore } = location;
    const total = minCrowdScore + moderateCrowdScore + maxCrowdScore;

    if (total === 0) return { level: "No Data", color: "#999", icon: "help" };

    if (maxCrowdScore >= moderateCrowdScore && maxCrowdScore >= minCrowdScore) {
      return { level: "High Crowd", color: "#F44336", icon: "trending-up" };
    } else if (moderateCrowdScore >= minCrowdScore) {
      return {
        level: "Moderate Crowd",
        color: "#FF9800",
        icon: "trending-flat",
      };
    } else {
      return { level: "Low Crowd", color: "#4CAF50", icon: "trending-down" };
    }
  };

  const fetchLocations = async () => {
    console.log("Fetching locations...");
    try {
      const response = await fetch(`${API_BASE_URL}/locations`);
      const result = await response.json();

      if (result.success) {
        // Fetch activities for each location to show recent activity
        const locationsWithActivities = await Promise.all(
          result.data.map(async (location) => {
            try {
              const activitiesResponse = await fetch(
                `${API_BASE_URL}/locations/${location._id}/activities`
              );
              const activitiesResult = await activitiesResponse.json();

              return {
                ...location,
                activities: activitiesResult.success
                  ? activitiesResult.data.activities || []
                  : [],
              };
            } catch (error) {
              console.error(
                `Error fetching activities for location ${location._id}:`,
                error
              );
              return {
                ...location,
                activities: [],
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
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const updateCrowdScore = async (locationId, crowdLevel) => {
    console.log("Location id: " + locationId, "Crowd level: " + crowdLevel);

    try {
      const response = await fetch(
        `${API_BASE_URL}/locations/${locationId}/crowd`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ crowdLevel }),
        }
      );

      const result = await response.json();

      if (result.success) {
        Alert.alert("Success", `${crowdLevel} crowd level updated!`);
        fetchLocations(); // Refresh the list
      } else {
        Alert.alert("Error", result.message);
      }
    } catch (error) {
      Alert.alert("Error", "Network error occurred");
      console.error("Update error:", error);
    }
  };

  // Manual trigger for score reduction (for testing)
  const triggerScoreReduction = async () => {
    Alert.alert(
      "Manual Score Reduction",
      "This will reduce all location scores by 1. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reduce Scores",
          onPress: async () => {
            try {
              const response = await fetch(
                `${API_BASE_URL}/locations/reduce-scores`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                }
              );

              const result = await response.json();

              if (result.success) {
                Alert.alert("Success", result.message);
                fetchLocations();
              } else {
                Alert.alert("Error", result.message);
              }
            } catch (error) {
              Alert.alert("Error", "Network error occurred");
            }
          },
        },
      ]
    );
  };

  const confirmCrowdUpdate = (locationId, locationName, crowdLevel) => {
    const levelText =
      crowdLevel === "min"
        ? "Low"
        : crowdLevel === "moderate"
        ? "Moderate"
        : "High";

    Alert.alert(
      "Update Crowd Level",
      `Mark "${locationName}" as ${levelText} crowded?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: () => updateCrowdScore(locationId, crowdLevel),
        },
      ]
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchLocations();
    fetchScoreReductionStatus();
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now - time) / (1000 * 60));

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    return `${Math.floor(diffInMinutes / 60)}h ${diffInMinutes % 60}m ago`;
  };

  const renderLocationItem = ({ item }) => {
    // console.log("item: " + item);

    const lastHourData = getLastHourCrowdData(item.activities || []);
    const currentLevel = getCurrentCrowdLevel(item); // Based on actual database scores

    // Get the most recent activity for display
    const sortedActivities = (item.activities || []).sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );
    const mostRecentActivity = sortedActivities[0];

    // Check if there are any score reductions in recent activities
    const recentReductions = sortedActivities
      .filter((activity) => activity.type === "score_reduction")
      .slice(0, 3);

    return (
      <View style={styles.locationCard}>
        <View style={styles.locationHeader}>
          <Text style={styles.locationName}>{item.name}</Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: currentLevel.color },
            ]}
          >
            <Icon name={currentLevel.icon} size={14} color="white" />
            <Text style={styles.statusText}>{currentLevel.level}</Text>
          </View>
        </View>

        <Text style={styles.locationCapacity}>Capacity: {item.capacity}</Text>

        {/* Current Database Scores (Auto-reducing) */}
        <View style={styles.scoresContainer}>
          <Text style={styles.scoresTitle}>
            Current Scores (Auto-reducing):
          </Text>
          <View style={styles.scoreRow}>
            <View style={styles.scoreItem}>
              <Text style={[styles.scoreNumber, { color: "#4CAF50" }]}>
                {item.minCrowdScore}
              </Text>
              <Text style={styles.scoreLabel}>Low</Text>
            </View>
            <View style={styles.scoreItem}>
              <Text style={[styles.scoreNumber, { color: "#FF9800" }]}>
                {item.moderateCrowdScore}
              </Text>
              <Text style={styles.scoreLabel}>Moderate</Text>
            </View>
            <View style={styles.scoreItem}>
              <Text style={[styles.scoreNumber, { color: "#F44336" }]}>
                {item.maxCrowdScore}
              </Text>
              <Text style={styles.scoreLabel}>High</Text>
            </View>
          </View>

          {/* Recent Activity Info */}
          {mostRecentActivity && (
            <View style={styles.lastUpdateContainer}>
              <Text style={styles.lastUpdateText}>
                Last update: {formatTimeAgo(mostRecentActivity.timestamp)}
              </Text>
            </View>
          )}

          {/* Score Reduction Indicators */}
          {recentReductions.length > 0 && (
            <View style={styles.reductionIndicator}>
              <Icon name="trending-down" size={12} color="#666" />
              <Text style={styles.reductionText}>
                {recentReductions.length} automatic reduction
                {recentReductions.length > 1 ? "s" : ""} recently
              </Text>
            </View>
          )}
        </View>

        {/* Last Hour Activity (Filtered View) */}
        <View style={styles.activityContainer}>
          <Text style={styles.activityTitle}>Last Hour Activity:</Text>
          <View style={styles.scoreRow}>
            <View style={styles.scoreItem}>
              <Text
                style={[styles.scoreNumber, { color: "#4CAF50", fontSize: 16 }]}
              >
                {lastHourData.minCrowdScore}
              </Text>
              <Text style={styles.scoreLabel}>Reports</Text>
            </View>
            <View style={styles.scoreItem}>
              <Text
                style={[styles.scoreNumber, { color: "#FF9800", fontSize: 16 }]}
              >
                {lastHourData.moderateCrowdScore}
              </Text>
              <Text style={styles.scoreLabel}>Reports</Text>
            </View>
            <View style={styles.scoreItem}>
              <Text
                style={[styles.scoreNumber, { color: "#F44336", fontSize: 16 }]}
              >
                {lastHourData.maxCrowdScore}
              </Text>
              <Text style={styles.scoreLabel}>Reports</Text>
            </View>
          </View>

          {lastHourData.total === 0 && (
            <Text style={styles.noDataText}>No reports in the last hour</Text>
          )}
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.crowdButton, styles.minButton]}
            onPress={() => confirmCrowdUpdate(item._id, item.name, "min")}
          >
            <Icon name="trending-down" size={20} color="white" />
            <Text style={styles.buttonText}>Low Crowd</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.crowdButton, styles.moderateButton]}
            onPress={() => confirmCrowdUpdate(item._id, item.name, "moderate")}
          >
            <Icon name="trending-flat" size={20} color="white" />
            <Text style={styles.buttonText}>Moderate</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.crowdButton, styles.maxButton]}
            onPress={() => confirmCrowdUpdate(item._id, item.name, "max")}
          >
            <Icon name="trending-up" size={20} color="white" />
            <Text style={styles.buttonText}>High Crowd</Text>
          </TouchableOpacity>
        </View>
      </View>
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
        <Text style={styles.header}>Organizer Panel</Text>
        <Text style={styles.subtitle}>Scores Auto-Reduce Every Hour</Text>

        {/* Score Reduction Status */}
        {scoreReductionStatus && (
          <View style={styles.statusContainer}>
            <Icon
              name={
                scoreReductionStatus.isRunning ? "schedule" : "schedule-off"
              }
              size={16}
              color={scoreReductionStatus.isRunning ? "#4CAF50" : "#F44336"}
            />
            <Text
              style={[
                styles.statusText,
                {
                  color: scoreReductionStatus.isRunning ? "#4CAF50" : "#F44336",
                },
              ]}
            >
              Auto-reduction:{" "}
              {scoreReductionStatus.isRunning ? "Active" : "Inactive"}
            </Text>
          </View>
        )}
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
    backgroundColor: "#007AFF",
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  header: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    color: "white",
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    color: "rgba(255,255,255,0.8)",
    marginTop: 5,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  statusText: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: "bold",
  },
  listContainer: {
    padding: 15,
    paddingBottom: 80, // Space for admin controls
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  locationCard: {
    backgroundColor: "white",
    borderRadius: 12,
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
  locationName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  locationCapacity: {
    fontSize: 14,
    color: "#666",
    marginBottom: 15,
  },
  scoresContainer: {
    backgroundColor: "#f8f9fa",
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  activityContainer: {
    backgroundColor: "#fff3cd",
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  scoresTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
    textAlign: "center",
  },
  scoreRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 10,
  },
  scoreItem: {
    alignItems: "center",
  },
  scoreNumber: {
    fontSize: 20,
    fontWeight: "bold",
  },
  scoreLabel: {
    fontSize: 11,
    color: "#666",
    marginTop: 2,
  },
  lastUpdateContainer: {
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    paddingTop: 8,
    marginTop: 5,
  },
  lastUpdateText: {
    fontSize: 11,
    color: "#666",
    textAlign: "center",
    fontStyle: "italic",
  },
  noDataText: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    fontStyle: "italic",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  crowdButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 8,
  },
  minButton: {
    backgroundColor: "#4CAF50",
  },
  moderateButton: {
    backgroundColor: "#FF9800",
  },
  maxButton: {
    backgroundColor: "#F44336",
  },
  buttonText: {
    color: "white",
    fontSize: 11,
    fontWeight: "bold",
    marginLeft: 5,
    textAlign: "center",
  },
});

export default OrganizerScreen;
