import { View, Text, StyleSheet } from "react-native";
import React from 'react'

const Index = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Welcome to the Dashboard</Text>
    </View>
  )
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f9fafb",
  },
  text: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1e40af",
  },
});


export default Index;