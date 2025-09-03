import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";

const Index = () => {
  const router = useRouter();

  useEffect(() => {
    const checkLogin = async () => {
      try {
        const isLoggedIn = await AsyncStorage.getItem("isLoggedIn");
        if (isLoggedIn === "true") {
          router.replace("/dashboard");
        } else {
          router.replace("/auth/login");
        }
      } catch (error) {
        console.error("Error checking login status:", error);
        router.replace("/auth/login");
      }
    };
    
    checkLogin();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" color="#1e40af" />
    </View>
  );
};

export default Index;