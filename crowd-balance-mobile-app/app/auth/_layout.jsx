import { Stack } from 'expo-router';

function AuthLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="LoginScreen/index"
        options={{
          title: 'Login',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="RegisterScreen/index"
        options={{
          title: 'Register',
          headerShown: false,
        }}
      />
    </Stack>
  );
}

export default AuthLayout;