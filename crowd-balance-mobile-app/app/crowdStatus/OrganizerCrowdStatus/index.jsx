import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const OrganizerScreen = () => {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // API Base URL - Replace with your actual API URL
  const API_BASE_URL = 'http://192.168.1.2:4000/locations';

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {

    console.log("Fetching locations...");
    try {
      const response = await fetch(API_BASE_URL);
      const result = await response.json();
      
      if (result.success) {
        setLocations(result.data);
      } else {
        Alert.alert('Error', 'Failed to fetch locations');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error occurred');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const updateCrowdScore = async (locationId, crowdLevel) => {

    console.log("Location id: " + locationId, "Crowd level: " + crowdLevel);

    try {
      const response = await fetch(`${API_BASE_URL}/${locationId}/crowd`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ crowdLevel }),
      });

      const result = await response.json();
      
      if (result.success) {
        Alert.alert('Success', `${crowdLevel} crowd level updated!`);
        fetchLocations(); // Refresh the list
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Network error occurred');
    }
  };

  const confirmCrowdUpdate = (locationId, locationName, crowdLevel) => {
    Alert.alert(
      'Update Crowd Level',
      `Mark "${locationName}" as ${crowdLevel} crowded?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => updateCrowdScore(locationId, crowdLevel) }
      ]
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchLocations();
  };

  const renderLocationItem = ({ item }) => (
    <View style={styles.locationCard}>
      <Text style={styles.locationName}>{item.name}</Text>
      <Text style={styles.locationCapacity}>Capacity: {item.capacity}</Text>
      
      <View style={styles.scoresContainer}>
        <Text style={styles.scoresTitle}>Current Scores:</Text>
        <View style={styles.scoreRow}>
          <Text style={styles.scoreText}>Min: {item.minCrowdScore}</Text>
          <Text style={styles.scoreText}>Moderate: {item.moderateCrowdScore}</Text>
          <Text style={styles.scoreText}>Max: {item.maxCrowdScore}</Text>
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.crowdButton, styles.minButton]}
          onPress={() => confirmCrowdUpdate(item._id, item.name, 'min')}
        >
          <Icon name="trending-down" size={24} color="white" />
          <Text style={styles.buttonText}>Min Crowded</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.crowdButton, styles.moderateButton]}
          onPress={() => confirmCrowdUpdate(item._id, item.name, 'moderate')}
        >
          <Icon name="trending-flat" size={24} color="white" />
          <Text style={styles.buttonText}>Moderate</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.crowdButton, styles.maxButton]}
          onPress={() => confirmCrowdUpdate(item._id, item.name, 'max')}
        >
          <Icon name="trending-up" size={24} color="white" />
          <Text style={styles.buttonText}>Max Crowded</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading locations...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Organizer Panel - Update Crowd Levels</Text>
      
      <FlatList
        data={locations}
        renderItem={renderLocationItem}
        keyExtractor={(item) => item._id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    padding: 20,
    backgroundColor: '#007AFF',
    color: 'white',
  },
  listContainer: {
    padding: 10,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  locationCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginVertical: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  locationName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  locationCapacity: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  scoresContainer: {
    backgroundColor: '#f8f8f8',
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
  },
  scoresTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scoreText: {
    fontSize: 12,
    color: '#666',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  crowdButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 5,
    marginHorizontal: 2,
  },
  minButton: {
    backgroundColor: '#4CAF50',
  },
  moderateButton: {
    backgroundColor: '#FF9800',
  },
  maxButton: {
    backgroundColor: '#F44336',
  },
  buttonText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 5,
    textAlign: 'center',
  },
});

export default OrganizerScreen;