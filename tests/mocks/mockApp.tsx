import React from 'react';
import { View, Text } from 'react-native';

// Mock the entire App component for testing
const MockApp = () => {
  return (
    <View testID="main-container" style={{ flex: 1 }}>
      <Text>Mock App</Text>
    </View>
  );
};

export default MockApp;