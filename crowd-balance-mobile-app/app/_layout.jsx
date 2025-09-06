import { Stack } from "expo-router";

function RootLayout() {
  console.log("RootLayout rendered");
  
  return (
    <Stack screenOptions={{
        headerShown: false, // This removes the "auth" header
      }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      {/* <Stack.Screen name="auth/LoginScreen/index" options={{ headerShown: false }} /> */}
      {/* <Stack.Screen name="auth/RegisterScreen/index" options={{ headerShown: false }} /> */}
      <Stack.Screen name="auth" options={{ headerShown: false }} />
      <Stack.Screen name="dashboard/index" options={{ headerShown: false }} />
      <Stack.Screen name="profile/index" options={{ headerShown: false }} />

      <Stack.Screen 
        name="GetLostInfo/index" 
        options={{ 
          headerShown: true,
          title: "Report Missing Person",
          headerStyle: { backgroundColor: "#1e40af" },
          headerTintColor: 'white',
          headerTitleStyle: { fontWeight: 'bold' }
        }} 
      />

      <Stack.Screen name="crowdStatus" options={{ headerShown: false }} />


      

    </Stack>
  );
}

export default RootLayout;