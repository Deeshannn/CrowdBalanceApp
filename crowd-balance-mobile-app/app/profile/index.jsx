import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import axios from "axios";

const Profile = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const userId = await AsyncStorage.getItem("userId");
      if (!userId) {
        router.replace("/auth/LoginScreen");
        return;
      }

      try {
        const res = await axios.get(`http://10.108.4.14:4000/users/${userId}`);
        setUser(res.data.user);
      } catch (err) {
        console.error(err);
        router.replace("/auth/LoginScreen");
      }
    };

    fetchUser();
  }, []);

  const handleLogout = async () => {
    await AsyncStorage.clear();
    router.replace("/auth/LoginScreen");
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <Text>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.label}>ID: {user._id}</Text>
      <Text style={styles.label}>Name: {user.name}</Text>
      <Text style={styles.label}>Email: {user.email}</Text>
      <Text style={styles.label}>Role: {user.userType}</Text>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 20 },
  label: { fontSize: 16, marginBottom: 10 },
  logoutButton: {
    backgroundColor: "red",
    padding: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  logoutText: { color: "white", fontWeight: "600" },
});

export default Profile;
