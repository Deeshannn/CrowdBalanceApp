import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { router, useLocalSearchParams } from "expo-router";
import { API_BASE_URL } from "../../../config";

const LocationDetail = () => {
  const params = useLocalSearchParams();
  const [location, setLocation] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // API Base URL
  // const API_BASE_URL = "http://192.168.1.2:4000/locations";

  const fetchLocationDetails = useCallback(async (locationId) => {
    if (!locationId) return;

    try {
      // Fetch updated location data
      const locationResponse = await fetch(`${API_BASE_URL}/locations`);
      const locationResult = await locationResponse.json();

      if (locationResult.success) {
        const updatedLocation = locationResult.data.find(
          (loc) => loc._id === locationId
        );
        if (updatedLocation) {
          setLocation((prevLocation) => {
            if (
              JSON.stringify(prevLocation) !== JSON.stringify(updatedLocation)
            ) {
              return updatedLocation;
            }
            return prevLocation;
          });
        }
      }

      // Fetch recent activities
      const activitiesResponse = await fetch(
        `${API_BASE_URL}/locations/${locationId}/activities`
      );
      const activitiesResult = await activitiesResponse.json();

      if (activitiesResult.success) {
        setActivities(activitiesResult.data.activities || []);
      }
    } catch (error) {
      console.error("Error fetching location details:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // Parse the location data from params
    const parsedLocation = params.locationData
      ? JSON.parse(params.locationData)
      : null;
    if (parsedLocation) {
      setLocation(parsedLocation);
      fetchLocationDetails(parsedLocation._id);
    } else {
      setLoading(false);
    }
  }, [params.locationData, fetchLocationDetails]);

  // Calculate last hour crowd data from activities
  const getLastHourCrowdData = () => {
    if (!activities || activities.length === 0) {
      return {
        minCrowdScore: 0,
        moderateCrowdScore: 0,
        maxCrowdScore: 0,
        total: 0,
      };
    }

    const counts = activities.reduce(
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

  const onRefresh = () => {
    if (location?._id) {
      setRefreshing(true);
      fetchLocationDetails(location._id);
    }
  };

  if (!location) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error: Location data not found</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const getCrowdLevel = (crowdData) => {
    const { minCrowdScore, moderateCrowdScore, maxCrowdScore, total } =
      crowdData;

    if (total === 0) return { level: "No Data", color: "#999", percentage: 0 };

    if (maxCrowdScore >= moderateCrowdScore && maxCrowdScore >= minCrowdScore) {
      return {
        level: "High Crowd",
        color: "#F44336",
        percentage: Math.round((maxCrowdScore / total) * 100),
      };
    } else if (moderateCrowdScore >= minCrowdScore) {
      return {
        level: "Moderate Crowd",
        color: "#FF9800",
        percentage: Math.round((moderateCrowdScore / total) * 100),
      };
    } else {
      return {
        level: "Low Crowd",
        color: "#4CAF50",
        percentage: Math.round((minCrowdScore / total) * 100),
      };
    }
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now - time) / (1000 * 60));

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    return `${Math.floor(diffInMinutes / 60)}h ${diffInMinutes % 60}m ago`;
  };

  const getCrowdLevelConfig = (crowdLevel) => {
    switch (crowdLevel) {
      case "min":
        return {
          label: "Low Crowd",
          color: "#4CAF50",
          icon: "trending-down",
          bgColor: "#E8F5E8",
        };
      case "moderate":
        return {
          label: "Moderate Crowd",
          color: "#FF9800",
          icon: "trending-flat",
          bgColor: "#FFF3E0",
        };
      case "max":
        return {
          label: "High Crowd",
          color: "#F44336",
          icon: "trending-up",
          bgColor: "#FFEBEE",
        };
      default:
        return {
          label: "Unknown",
          color: "#999",
          icon: "help",
          bgColor: "#F5F5F5",
        };
    }
  };

  const renderCrowdChart = (crowdData) => {
    const { minCrowdScore, moderateCrowdScore, maxCrowdScore, total } =
      crowdData;

    if (total === 0) {
      return (
        <View style={styles.chartContainer}>
          <Text style={styles.noDataText}>
            No crowd data available for the last hour
          </Text>
        </View>
      );
    }

    const minPercentage = (minCrowdScore / total) * 100;
    const moderatePercentage = (moderateCrowdScore / total) * 100;
    const maxPercentage = (maxCrowdScore / total) * 100;

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>
          Crowd Level Distribution (Last Hour)
        </Text>

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

        <View style={styles.percentageContainer}>
          <Text style={styles.percentageText}>
            Current Dominant Level:{" "}
            <Text
              style={[
                styles.percentageValue,
                { color: getCrowdLevel(crowdData).color },
              ]}
            >
              {getCrowdLevel(crowdData).level} (
              {getCrowdLevel(crowdData).percentage}%)
            </Text>
          </Text>
        </View>
      </View>
    );
  };

  const renderActivityFeed = () => {
    if (activities.length === 0) {
      return (
        <View style={styles.noActivityContainer}>
          <Icon name="schedule" size={48} color="#ccc" />
          <Text style={styles.noActivityText}>No recent updates</Text>
          <Text style={styles.noActivitySubtext}>
            Organizers haven't updated crowd levels in the last hour
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.activityList}>
        {activities.map((activity, index) => {
          const config = getCrowdLevelConfig(activity.crowdLevel);
          return (
            <View key={index} style={styles.activityItem}>
              <View
                style={[
                  styles.activityIcon,
                  { backgroundColor: config.bgColor },
                ]}
              >
                <Icon name={config.icon} size={20} color={config.color} />
              </View>

              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>
                  Crowd level updated to{" "}
                  <Text style={{ color: config.color, fontWeight: "bold" }}>
                    {config.label}
                  </Text>
                </Text>
                <Text style={styles.activityTime}>
                  {formatTimeAgo(activity.timestamp)}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  // Get last hour data instead of all-time data
  const lastHourData = getLastHourCrowdData();
  const crowdInfo = getCrowdLevel(lastHourData);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading location details...</Text>
      </View>
    );
  }

  // Fixed navigation function - don't call immediately
  const handleAssignOrganizers = () => {
    router.push({
      pathname: "./AssignOrganizers",
      params: { 
        crowdLevel: crowdInfo.level,
        locationId: location._id,
        locationName: location.name,
        locationCapacity: location.capacity.toString()
      },
    });
  };

  const handleHome = () => {
    router.push("../dashboard");
  };

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
        <Text style={styles.header}>Location Details</Text>
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
        <View style={styles.locationCard}>
          <View style={styles.locationHeader}>
            <Text style={styles.locationName}>{location.name}</Text>
            <View
              style={[styles.statusBadge, { backgroundColor: crowdInfo.color }]}
            >
              <Text style={styles.statusText}>{crowdInfo.level}</Text>
            </View>
          </View>

          <Text style={styles.locationCapacity}>
            Capacity: {location.capacity} people
          </Text>
          <Text style={styles.locationId}>Location ID: {location._id}</Text>
        </View>

        {/* Live Activity Feed */}
        <View style={styles.activityCard}>
          <View style={styles.activityHeader}>
            <Icon name="update" size={20} color="#007AFF" />
            <Text style={styles.cardTitle}>Live Activity Feed (Last Hour)</Text>
          </View>
          {renderActivityFeed()}
        </View>

        {/* Crowd Statistics Card - Now showing last hour data */}
        <View style={styles.statsCard}>
          <Text style={styles.cardTitle}>Crowd Statistics (Last Hour)</Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{lastHourData.total}</Text>
              <Text style={styles.statLabel}>Total Reports</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{location.capacity}</Text>
              <Text style={styles.statLabel}>Max Capacity</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: crowdInfo.color }]}>
                {crowdInfo.percentage}%
              </Text>
              <Text style={styles.statLabel}>Dominant Level</Text>
            </View>
          </View>
        </View>

        {/* Chart Card - Now showing last hour data */}
        <View style={styles.chartCard}>
          <Text style={styles.cardTitle}>Crowd Level Analysis (Last Hour)</Text>
          {renderCrowdChart(lastHourData)}
        </View>

        {/* Individual Score Breakdown - Now showing last hour data */}
        <View style={styles.breakdownCard}>
          <Text style={styles.cardTitle}>Detailed Breakdown (Last Hour)</Text>

          <View style={styles.scoreItem}>
            <View style={styles.scoreHeader}>
              <View
                style={[styles.scoreIndicator, { backgroundColor: "#4CAF50" }]}
              />
              <Text style={styles.scoreTitle}>Low Crowd Reports</Text>
            </View>
            <Text style={styles.scoreValue}>{lastHourData.minCrowdScore}</Text>
          </View>

          <View style={styles.scoreItem}>
            <View style={styles.scoreHeader}>
              <View
                style={[styles.scoreIndicator, { backgroundColor: "#FF9800" }]}
              />
              <Text style={styles.scoreTitle}>Moderate Crowd Reports</Text>
            </View>
            <Text style={styles.scoreValue}>
              {lastHourData.moderateCrowdScore}
            </Text>
          </View>

          <View style={styles.scoreItem}>
            <View style={styles.scoreHeader}>
              <View
                style={[styles.scoreIndicator, { backgroundColor: "#F44336" }]}
              />
              <Text style={styles.scoreTitle}>High Crowd Reports</Text>
            </View>
            <Text style={styles.scoreValue}>{lastHourData.maxCrowdScore}</Text>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.assignButton]}
            onPress={handleAssignOrganizers}
          >
            <Icon name="person-add" size={20} color="white" style={styles.buttonIcon} />
            <Text style={styles.buttonText}>Assign Organizers</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.homeButton]}
            onPress={handleHome}
          >
            <Icon name="home" size={20} color="white" style={styles.buttonIcon} />
            <Text style={styles.buttonText}>Home</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#F44336",
    marginBottom: 20,
    textAlign: "center",
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
  backButtonText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "bold",
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
  locationCard: {
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
    marginBottom: 15,
  },
  locationName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  statusText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  locationCapacity: {
    fontSize: 16,
    color: "#666",
    marginBottom: 5,
  },
  locationId: {
    fontSize: 12,
    color: "#999",
    fontFamily: "monospace",
  },
  // Activity Feed Styles
  activityCard: {
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
  activityHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  activityList: {
    marginTop: 10,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    color: "#333",
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 12,
    color: "#666",
  },
  noActivityContainer: {
    alignItems: "center",
    paddingVertical: 30,
  },
  noActivityText: {
    fontSize: 16,
    color: "#666",
    marginTop: 10,
    marginBottom: 5,
  },
  noActivitySubtext: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  // Existing styles continue...
  statsCard: {
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
  chartCard: {
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
  breakdownCard: {
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
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginLeft: 8,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#007AFF",
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    marginTop: 5,
  },
  chartContainer: {
    marginTop: 10,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
  },
  chartBar: {
    flexDirection: "row",
    height: 12,
    backgroundColor: "#e0e0e0",
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 15,
  },
  chartSegment: {
    height: "100%",
  },
  chartLegend: {
    marginBottom: 15,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  legendColor: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 8,
  },
  legendText: {
    fontSize: 13,
    color: "#666",
  },
  percentageContainer: {
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  percentageText: {
    fontSize: 14,
    color: "#333",
    textAlign: "center",
  },
  percentageValue: {
    fontWeight: "bold",
  },
  noDataText: {
    textAlign: "center",
    color: "#999",
    fontStyle: "italic",
    fontSize: 14,
  },
  scoreItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  scoreHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  scoreIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  scoreTitle: {
    fontSize: 14,
    color: "#333",
  },
  scoreValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#007AFF",
  },
  buttonContainer: {
    marginBottom: 35,
    gap: 15,
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  button: {
    flexDirection: "row",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  assignButton: {
    backgroundColor: "#1e40af",
  },
  homeButton: {
    backgroundColor: "#059669",
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  }
});

export default LocationDetail;