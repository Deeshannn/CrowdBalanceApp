import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
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
        if (!userId) {
          router.replace("/auth/login");
          return;
        }

        const res = await axios.get(`http://10.30.14.167:4000/users/${userId}`);
        setUser(res.data.user);
      } catch (err) {
        console.error("Error fetching user:", err);
        // Clear invalid session and redirect to login
        await AsyncStorage.clear();
        router.replace("/auth/login");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

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
        <Text>Error loading user data</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Welcome, {user.name} 👋</Text>
        <Text style={styles.subtitle}>Role: {user.userType}</Text>
        {user.userType === "Organizer" && user.assignedHall && (
          <Text style={styles.hallInfo}>Hall: {user.assignedHall}</Text>
        )}
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push("/profile")}
        >
          <Text style={styles.buttonText}>View Profile</Text>
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
  buttonContainer: {
    flex: 1,
    // justifyContent: "center",
  },
  button: {
    backgroundColor: "#1e40af",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 20,
  },
  buttonText: { 
    color: "white", 
    fontSize: 16, 
    fontWeight: "600",
  },
});

export default Dashboard;