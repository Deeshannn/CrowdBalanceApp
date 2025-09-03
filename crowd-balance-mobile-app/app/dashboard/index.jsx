import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Image,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [missingReports, setMissingReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userId = await AsyncStorage.getItem("userId");
        const isLoggedIn = await AsyncStorage.getItem("isLoggedIn");
        
        if (!userId || isLoggedIn !== "true") {
          console.log("No valid session found, redirecting to login");
          router.replace("/auth/login");
          return;
        }

        // First try to get user data from AsyncStorage (stored during login)
        const storedUserData = await AsyncStorage.getItem("userData");
        if (storedUserData) {
          console.log("Loading user data from AsyncStorage");
          const userData = JSON.parse(storedUserData);
          setUser(userData);
          setLoading(false);
          // Fetch all missing reports (not user-specific)
          fetchMissingReports();
          return;
        }

        // Fallback: Fetch from server if not in AsyncStorage
        console.log("Fetching user data from server");
        const res = await axios.get(`http://10.108.4.14:4000/users/${userId}`, {
          timeout: 10000, // 10 second timeout
        });
        
        if (res.data && res.data.user) {
          setUser(res.data.user);
          // Store for future use
          await AsyncStorage.setItem("userData", JSON.stringify(res.data.user));
          // Fetch all missing reports (not user-specific)
          fetchMissingReports();
        } else {
          throw new Error("Invalid response from server");
        }
      } catch (err) {
        console.error("Error fetching user:", err);
        
        // If we have basic user info from AsyncStorage, use that as fallback
        const userName = await AsyncStorage.getItem("userName");
        const userType = await AsyncStorage.getItem("userType");
        const userId = await AsyncStorage.getItem("userId");
        
        if (userName && userType) {
          console.log("Using fallback user data from AsyncStorage");
          setUser({
            name: userName,
            userType: userType,
            id: userId
          });
          // Fetch all missing reports
          fetchMissingReports();
        } else {
          // Clear invalid session and redirect to login
          await AsyncStorage.clear();
          router.replace("/auth/login");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const fetchMissingReports = async () => {
    setReportsLoading(true);
    try {
      // Fetch ALL missing reports (not user-specific)
      const response = await axios.get(`http://10.108.4.14:4000/missing-reports/`, {
        timeout: 10000,
      });
      
      if (response.data && response.data.reports) {
        setMissingReports(response.data.reports);
        console.log("Fetched all missing reports:", response.data.reports.length);
      }
    } catch (error) {
      console.error("Error fetching missing reports:", error);
      // Don't show alert for network errors, just log them
    } finally {
      setReportsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMissingReports();
    setRefreshing(false);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };

  const getStatusStyle = (status) => {
    switch(status) {
      case 'Active':
        return { backgroundColor: '#ef4444', color: 'white' };
      case 'Found':
        return { backgroundColor: '#10b981', color: 'white' };
      case 'Closed':
        return { backgroundColor: '#6b7280', color: 'white' };
      default:
        return { backgroundColor: '#ef4444', color: 'white' };
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.clear();
    router.replace("/auth/LoginScreen");
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1e40af" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error loading user data</Text>
        <TouchableOpacity style={styles.button} onPress={handleLogout}>
          <Text style={styles.buttonText}>Return to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleReportMissing = () => {
    router.push('/GetLostInfo');
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Welcome, {user.name} 👋</Text>
        <Text style={styles.subtitle}>Role: {user.userType}</Text>
        {user.userType === "Organizer" && user.assignedHall && (
          <Text style={styles.hallInfo}>Hall: {user.assignedHall}</Text>
        )}
      </View>

      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={styles.emergencyButton}
          onPress={handleReportMissing}
        >
          <Text style={styles.emergencyButtonText}>
            🚨 Report Missing Person
          </Text>
        </TouchableOpacity>
      </View>

      {/* Missing Reports Section - Now shows ALL reports */}
      <View style={styles.reportsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>All Missing Person Reports</Text>
          <Text style={styles.reportCount}>({missingReports.length})</Text>
        </View>

        {reportsLoading ? (
          <View style={styles.reportsLoading}>
            <ActivityIndicator size="small" color="#1e40af" />
            <Text style={styles.loadingText}>Loading reports...</Text>
          </View>
        ) : missingReports.length === 0 ? (
          <View style={styles.noReports}>
            <Text style={styles.noReportsIcon}>📄</Text>
            <Text style={styles.noReportsText}>No missing persons</Text>
            <Text style={styles.noReportsSubtext}>
              No missing person reports have been filed yet
            </Text>
          </View>
        ) : (
          <View style={styles.reportsList}>
            {missingReports.map((report) => (
              <View key={report._id} style={styles.reportCard}>
                <View style={styles.reportHeader}>
                  <Image source={{ uri: report.image }} style={styles.reportImage} />
                  <View style={styles.reportInfo}>
                    <Text style={styles.reportName}>{report.name}</Text>
                    <Text style={styles.reportDetails}>Age: {report.age} • {report.gender}</Text>
                    <Text style={styles.reportLocation}>📍 {report.lastseenlocation}</Text>
                    <Text style={styles.reportDate}>
                      Reported: {formatDate(report.createdAt)}
                    </Text>
                    {/* Show who reported it */}
                    {report.reportedBy && (
                      <Text style={styles.reportedBy}>
                        Reported by: {report.reportedBy.name || 'Unknown'}
                      </Text>
                    )}
                  </View>
                  <View style={[styles.statusBadge, getStatusStyle(report.status)]}>
                    <Text style={styles.statusText}>{report.status}</Text>
                  </View>
                </View>
                {report.description && report.description.length > 0 && (
                  <View style={styles.reportDescription}>
                    <Text style={styles.descriptionLabel}>Description:</Text>
                    {report.description.map((desc, index) => (
                      <Text key={index} style={styles.descriptionText}>• {desc}</Text>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push("/profile")}
        >
          <Text style={styles.buttonText}>View Profile</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, styles.logoutButton]}
          onPress={handleLogout}
        >
          <Text style={styles.buttonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9fafb",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#6b7280",
  },
  errorText: {
    fontSize: 18,
    color: "#ef4444",
    textAlign: "center",
    marginBottom: 20,
  },
  header: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 24,
    margin: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: "#6b7280",
    marginBottom: 8,
  },
  hallInfo: {
    fontSize: 16,
    color: "#1e40af",
    fontWeight: "600",
  },
  actionContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  emergencyButton: {
    backgroundColor: "#1e40af",
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  emergencyButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  reportsSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  reportCount: {
    fontSize: 16,
    color: '#6b7280',
    marginLeft: 8,
  },
  reportsLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  noReports: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  noReportsIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  noReportsText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  noReportsSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  reportsList: {
    gap: 12,
  },
  reportCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  reportImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  reportInfo: {
    flex: 1,
  },
  reportName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  reportDetails: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  reportLocation: {
    fontSize: 14,
    color: '#1e40af',
    marginBottom: 4,
  },
  reportDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  reportedBy: {
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  reportDescription: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 12,
  },
  descriptionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  descriptionText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  buttonContainer: {
    gap: 15,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  button: {
    backgroundColor: "#1e40af",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  logoutButton: {
    backgroundColor: "#ef4444",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default Dashboard;