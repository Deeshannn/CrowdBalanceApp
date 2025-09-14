import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import axios from "axios";
import { API_BASE_URL } from "../../config";

const Profile = () => {
  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // Editable fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [assignedHall, setAssignedHall] = useState("");
  const [status, setStatus] = useState("Available");

  useEffect(() => {
    const fetchUser = async () => {
      const userId = await AsyncStorage.getItem("userId");
      if (!userId) {
        router.replace("/auth/LoginScreen");
        return;
      }

      try {
        const res = await axios.get(`${API_BASE_URL}/users/${userId}`);
        const u = res.data.user;
        setUser(u);
        setName(u.name);
        setPhone(u.phone || "");
        setAssignedHall(u.assignedHall || "");
        setStatus(u.status || "Available");
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

  const handleSave = async () => {
    try {
      const updatedUser = {
        name,
        phone,
        status,
      };

      console.log("API URL:", `${API_BASE_URL}/users/${user._id}`);
      console.log("User ID:", user._id);
      console.log("Updated User Data:", updatedUser);

      const res = await axios.put(
        `${API_BASE_URL}/users/organizers/${user._id}`,
        updatedUser
      );
      console.log("updated...");

      setUser(res.data.user); // Update UI
      setIsEditing(false);
      fetchUser();
    } catch (err) {
      console.error("Error updating profile:", err);
    }
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.loading}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Profile</Text>

        {isEditing ? (
          <>
            <Text style={styles.label}>Name:</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
            />

            {user.userType === "Organizer" && (
              <>
                <Text style={styles.label}>Phone:</Text>
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                />

                <Text style={styles.label}>Status:</Text>
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={status}
                    onValueChange={(itemValue) => setStatus(itemValue)}
                    style={styles.picker}
                  >
                    <Picker.Item label="Available" value="Available" />
                    <Picker.Item label="Busy" value="Busy" />
                  </Picker>
                </View>
              </>
            )}

            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.label}>ID:</Text>
            <Text style={styles.value}>{user._id}</Text>

            <Text style={styles.label}>Name:</Text>
            <Text style={styles.value}>{user.name}</Text>

            <Text style={styles.label}>Email:</Text>
            <Text style={styles.value}>{user.email}</Text>

            <Text style={styles.label}>Role:</Text>
            <Text style={styles.value}>{user.userType}</Text>

            {user.userType === "Organizer" && (
              <>
                <Text style={styles.label}>Phone:</Text>
                <Text style={styles.value}>{user.phone}</Text>

                <Text style={styles.label}>Assigned Hall:</Text>
                <Text style={styles.value}>
                  {user.assignedHall || "Not Assigned"}
                </Text>

                <Text style={styles.label}>Status:</Text>
                <Text
                  style={[
                    styles.value,
                    user.status === "Available"
                      ? styles.statusAvailable
                      : styles.statusBusy,
                  ]}
                >
                  {user.status}
                </Text>
              </>
            )}

            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setIsEditing(true)}
            >
              <Text style={styles.editText}>Edit Profile</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f6fa",
  },
  card: {
    width: "90%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#2c3e50",
  },
  label: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#555",
    marginTop: 10,
  },
  value: {
    fontSize: 16,
    color: "#333",
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    padding: 8,
    marginBottom: 10,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    marginBottom: 10,
    overflow: "hidden",
  },
  picker: {
    width: "100%",
    height: 44,
  },
  statusAvailable: {
    color: "green",
    fontWeight: "bold",
  },
  statusBusy: {
    color: "red",
    fontWeight: "bold",
  },
  editButton: {
    backgroundColor: "#1e40af",
    padding: 12,
    borderRadius: 8,
    marginTop: 20,
    alignItems: "center",
  },
  editText: { color: "white", fontWeight: "600", fontSize: 16 },
  saveButton: {
    backgroundColor: "#1e40af",
    padding: 12,
    borderRadius: 8,
    marginTop: 20,
    alignItems: "center",
  },
  saveText: { color: "white", fontWeight: "600", fontSize: 16 },
  logoutButton: {
    backgroundColor: "#ef4444",
    padding: 12,
    borderRadius: 8,
    marginTop: 20,
    alignItems: "center",
  },
  logoutText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
  loading: {
    fontSize: 18,
    color: "#555",
  },
});

export default Profile;
