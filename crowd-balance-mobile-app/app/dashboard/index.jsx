import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

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
        } else {
          throw new Error("Invalid response from server");
        }
      } catch (err) {
        console.error("Error fetching user:", err);
        
        // If we have basic user info from AsyncStorage, use that as fallback
        const userName = await AsyncStorage.getItem("userName");
        const userType = await AsyncStorage.getItem("userType");
        
        if (userName && userType) {
          console.log("Using fallback user data from AsyncStorage");
          setUser({
            name: userName,
            userType: userType,
            id: await AsyncStorage.getItem("userId")
          });
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
    <View style={styles.container}>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
    padding: 20,
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
    marginBottom: 20,
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
    marginBottom: 20,
  },
  emergencyButton: {
    backgroundColor: "#1e40af",
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 10,
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
  buttonContainer: {
    flex: 1,
    gap: 15,
  },
  button: {
    backgroundColor: "#1e40af",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 20,
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