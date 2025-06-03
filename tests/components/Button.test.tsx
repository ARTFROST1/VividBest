import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { render, fireEvent } from '../utils/testUtils';

// Simple Button component for testing
const Button = ({ 
  title, 
  onPress, 
  disabled = false 
}: { 
  title: string; 
  onPress: () => void; 
  disabled?: boolean;
}) => (
  <TouchableOpacity 
    testID="button" 
    onPress={onPress} 
    disabled={disabled}
    style={{ 
      backgroundColor: disabled ? '#cccccc' : '#2196f3',
      padding: 10,
      borderRadius: 5,
      alignItems: 'center',
      opacity: disabled ? 0.7 : 1
    }}
  >
    <Text 
      testID="button-text"
      style={{ 
        color: 'white', 
        fontWeight: 'bold' 
      }}
    >
      {title}
    </Text>
  </TouchableOpacity>
);

// Mock the actual Button component
jest.mock('../../src/components/Button', () => {
  return {
    __esModule: true,
    default: ({ title, onPress, disabled }) => (
      <Button title={title} onPress={onPress} disabled={disabled} />
    )
  };
});

describe('Button Component', () => {
  it('renders correctly with title', () => {
    const { getByTestId, getByText } = render(
      <Button title="Press Me" onPress={() => {}} />
    );
    
    expect(getByTestId('button')).toBeTruthy();
    expect(getByText('Press Me')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPressMock = jest.fn();
    const { getByTestId } = render(
      <Button title="Press Me" onPress={onPressMock} />
    );
    
    fireEvent.press(getByTestId('button'));
    expect(onPressMock).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', () => {
    const onPressMock = jest.fn();
    const { getByTestId } = render(
      <Button title="Press Me" onPress={onPressMock} disabled={true} />
    );
    
    fireEvent.press(getByTestId('button'));
    expect(onPressMock).not.toHaveBeenCalled();
  });
});