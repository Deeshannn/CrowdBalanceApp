import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
} from "react-native";

import { router } from "expo-router";

const Login = ({ onLogin, onNavigateRegister }) => {
  const [role, setRole] = useState("organizer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (onLogin) {
      onLogin(role, { email, password });
    } else {
      Alert.alert("Success", `Logging in as ${role}`);
    }
  };

  const handleRoleChange = (selectedRole) => {
    setRole(selectedRole);
  };

  const navigateToRegister = () => {
    router.push("/auth/RegisterScreen");
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <View style={styles.logoPlaceholder}>
                <Text style={styles.logoText}>ENGEX</Text>
              </View>
            </View>
            <Text style={styles.title}>ENGEX Control</Text>
            <Text style={styles.subtitle}>Crowd Management & Alert System</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Role Selection */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Login as</Text>
              <View style={styles.radioGroup}>
                <TouchableOpacity
                  style={styles.radioOption}
                  onPress={() => handleRoleChange("organizer")}
                >
                  <View style={styles.radioButton}>
                    {role === "organizer" && (
                      <View style={styles.radioButtonSelected} />
                    )}
                  </View>
                  <Text style={styles.radioLabel}>Organizer</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.radioOption}
                  onPress={() => handleRoleChange("panel")}
                >
                  <View style={styles.radioButton}>
                    {role === "panel" && (
                      <View style={styles.radioButtonSelected} />
                    )}
                  </View>
                  <Text style={styles.radioLabel}>Main Panel</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Email Input */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder={
                  role === "panel" ? "panel@engex.com" : "organizer@engex.com"
                }
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Password Input */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Login Button */}
            <TouchableOpacity style={styles.loginButton} onPress={handleSubmit}>
              <Text style={styles.loginButtonText}>
                Login as {role === "panel" ? "Main Panel" : "Organizer"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Navigate to Registration Page */}
          <View style={styles.loginLinkContainer}>
            <Text style={styles.loginText}> Not registered yet? </Text>
            <TouchableOpacity onPress={navigateToRegister}>
              <Text style={styles.signUpText}>SignUp</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1e40af",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 16,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  logoContainer: {
    marginBottom: 16,
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    backgroundColor: "#1e40af",
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  logoText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
  },
  form: {
    marginBottom: 24,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  radioGroup: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 24,
  },
  radioOption: {
    flexDirection: "row",
    alignItems: "center",
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#1e40af",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  radioButtonSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#1e40af",
  },
  radioLabel: {
    fontSize: 16,
    color: "#374151",
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "#f9fafb",
  },
  loginButton: {
    backgroundColor: "#1e40af",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  loginButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  loginLinkContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 12,
  },
  loginText: {
    fontSize: 14,
    color: "#374151",
  },
  signUpText: {
    fontSize: 14,
    color: "#1e40af",
    fontWeight: "600",
  },
});

export default Login;
