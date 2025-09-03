import { Stack } from 'expo-router'; // Import Stack Navigator

function RootLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index" // the root route /
        options={{ headerShown: false }} // Hides the default header
      />
      <Stack.Screen
        name="auth" // dynamic route
        options={{ headerShown: false, }}
      />
      <Stack.Screen
        name="dashboard/index"
        options={{ headerShown: false, }}
      />
    </Stack>
  );
}

export default RootLayout;