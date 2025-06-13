import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Image,
  StyleSheet,
  TouchableOpacity,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
  Platform,
  Dimensions,
} from 'react-native';
import { IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface ResizableImageProps {
  uri: string;
  initialWidth?: number;
  initialHeight?: number;
  maxWidth?: number;
  onDelete?: () => void;
  onResize?: (width: number, height: number) => void;
  onMove?: (x: number, y: number) => void;
  x?: number;
  y?: number;
}

export const ResizableImage: React.FC<ResizableImageProps> = ({
  uri,
  initialWidth = 200,
  initialHeight = 200,
  maxWidth = 600,
  onDelete,
  onResize,
  onMove,
  x,
  y,
}) => {
  // Temporarily disable ResizableImage on Android to avoid crash
  if (Platform.OS === 'android') {
    return null;
  }
  // Get screen dimensions for max width
  const screenWidth = Dimensions.get('window').width - 40;
  const actualMaxWidth = Math.min(maxWidth, screenWidth);
  
  // State for dimensions
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: initialWidth,
    height: initialHeight,
  });
  // Track container size
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  // Use x and y props directly for absolute positioning; no internal position state
  
  // State for selection
  const [isSelected, setIsSelected] = useState(false);
  
  // Cache the natural aspect ratio to avoid divide-by-zero and drift after multiple resizes
  const naturalRatioRef = useRef(dimensions.width / (dimensions.height || 1));
  const aspectRatio = naturalRatioRef.current;
  
  // Create pan responder for dragging the image
  // Update container size on layout
  const onContainerLayout = (e: any) => {
    const { width, height } = e.nativeEvent.layout;
    setContainerSize({ width, height });
  };

  // Helper to check if a point is near any corner
const isNearCorner = (gestureX: number, gestureY: number) => {
  const CORNER_SIZE = 32; // px, should match handle size + padding
  const { width, height } = dimensions;
  // (0,0) is top-left of image
  // Top-left
  if (gestureX < CORNER_SIZE && gestureY < CORNER_SIZE) return true;
  // Top-right
  if (gestureX > width - CORNER_SIZE && gestureY < CORNER_SIZE) return true;
  // Bottom-left
  if (gestureX < CORNER_SIZE && gestureY > height - CORNER_SIZE) return true;
  // Bottom-right
  if (gestureX > width - CORNER_SIZE && gestureY > height - CORNER_SIZE) return true;
  return false;
};

const imagePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt, gestureState) => {
        // evt.nativeEvent.locationX/Y are relative to image
        const { locationX, locationY } = evt.nativeEvent;
        return !isNearCorner(locationX, locationY);
      },
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        const { locationX, locationY } = evt.nativeEvent;
        return !isNearCorner(locationX, locationY);
      },
      
      onPanResponderGrant: () => {
        setIsSelected(true);
      },
      
      onPanResponderMove: (_, gestureState) => {
        const { dx, dy } = gestureState;
        if (dx !== 0 || dy !== 0) {
          handleDrag(dx, dy);
        }
      },
      
      onPanResponderRelease: () => {
        // Keep selected state after drag
      },
    })
  ).current;
  
  // Reference to track which corner is being dragged
  const activeCorner = useRef<string | null>(null);
  const startDimensions = useRef({ width: initialWidth, height: initialHeight });
  
  // Create pan responder for top-left corner
  const topLeftResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      
      onPanResponderGrant: () => {
        activeCorner.current = 'topLeft';
        startDimensions.current = { ...dimensions };
      },
      
      onPanResponderMove: (_, gestureState) => {
        const { dx, dy } = gestureState;
        // For top-left, negative dx/dy means growing the image
        const deltaWidth = -dx;
        const deltaHeight = -dy;
        
        // Maintain aspect ratio using the larger delta
        const delta = Math.max(deltaWidth, deltaHeight);
        
        // Calculate new dimensions
        let newWidth = startDimensions.current.width + delta;
        newWidth = Math.max(50, Math.min(newWidth, actualMaxWidth));
        const newHeight = newWidth / aspectRatio;
        
        // Update dimensions
        setDimensions({ width: newWidth, height: newHeight });
        
        // When resizing from top-left, we need to adjust position too
        if (onMove) {
          const deltaH = newHeight - startDimensions.current.height;
          onMove(-delta, -deltaH);
        }
        
        // Call the onResize callback if provided
        if (onResize) {
          onResize(Math.round(newWidth), Math.round(newHeight));
        }
      },
      
      onPanResponderRelease: () => {
        activeCorner.current = null;
      },
    })
  ).current;
  
  // Create pan responder for top-right corner
  const topRightResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      
      onPanResponderGrant: () => {
        activeCorner.current = 'topRight';
        startDimensions.current = { ...dimensions };
      },
      
      onPanResponderMove: (_, gestureState) => {
        const { dx, dy } = gestureState;
        // For top-right, positive dx and negative dy means growing
        const deltaWidth = dx;
        const deltaHeight = -dy;
        
        // Maintain aspect ratio using the larger delta
        const delta = Math.max(deltaWidth, deltaHeight);
        
        // Calculate new dimensions
        let newWidth = startDimensions.current.width + delta;
        newWidth = Math.max(50, Math.min(newWidth, actualMaxWidth));
        const newHeight = newWidth / aspectRatio;
        
        // Update dimensions
        setDimensions({ width: newWidth, height: newHeight });
        
        // When resizing from top-right, we need to adjust vertical position
        if (onMove) {
          const deltaH = newHeight - startDimensions.current.height;
          onMove(0, -deltaH);
        }
        
        // Call the onResize callback if provided
        if (onResize) {
          onResize(Math.round(newWidth), Math.round(newHeight));
        }
      },
      
      onPanResponderRelease: () => {
        activeCorner.current = null;
      },
    })
  ).current;
  
  // Create pan responder for bottom-left corner
  const bottomLeftResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      
      onPanResponderGrant: () => {
        activeCorner.current = 'bottomLeft';
        startDimensions.current = { ...dimensions };
      },
      
      onPanResponderMove: (_, gestureState) => {
        const { dx, dy } = gestureState;
        // For bottom-left, negative dx and positive dy means growing
        const deltaWidth = -dx;
        const deltaHeight = dy;
        
        // Maintain aspect ratio using the larger delta
        const delta = Math.max(deltaWidth, deltaHeight);
        
        // Calculate new dimensions
        let newWidth = startDimensions.current.width + delta;
        newWidth = Math.max(50, Math.min(newWidth, actualMaxWidth));
        const newHeight = newWidth / aspectRatio;
        
        // Update dimensions
        setDimensions({ width: newWidth, height: newHeight });
        
        // When resizing from bottom-left, we need to adjust horizontal position
        if (onMove) {
          const deltaH = newHeight - startDimensions.current.height;
          onMove(-delta, deltaH);
        }
        
        // Call the onResize callback if provided
        if (onResize) {
          onResize(Math.round(newWidth), Math.round(newHeight));
        }
      },
      
      onPanResponderRelease: () => {
        activeCorner.current = null;
      },
    })
  ).current;
  
  // Create pan responder for bottom-right corner
  const bottomRightResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      
      onPanResponderGrant: () => {
        activeCorner.current = 'bottomRight';
        startDimensions.current = { ...dimensions };
      },
      
      onPanResponderMove: (_, gestureState) => {
        // Calculate new width based on drag
        const { dx, dy } = gestureState;
        
        // Use the larger of dx or dy to maintain aspect ratio
        const delta = Math.max(dx, dy);
        
        // Calculate new dimensions
        let newWidth = startDimensions.current.width + delta;
        
        // Enforce minimum and maximum width
        newWidth = Math.max(50, Math.min(newWidth, actualMaxWidth));
        
        // Calculate height based on aspect ratio
        const newHeight = newWidth / aspectRatio;
        
        // Update dimensions
        setDimensions({ width: newWidth, height: newHeight });
        
        // Call the onResize callback if provided
        if (onResize) {
          onResize(Math.round(newWidth), Math.round(newHeight));
        }
      },
      
      onPanResponderRelease: () => {
        activeCorner.current = null;
      },
    })
  ).current;
  
  // Handle image drag
  const handleDrag = (dx: number, dy: number) => {
    if (onMove && (dx !== 0 || dy !== 0)) {
      // Bounds checking
      const maxX = containerSize.width - dimensions.width;
      const maxY = containerSize.height - dimensions.height;
      const currentX = x ?? 0;
      const currentY = y ?? 0;
      const clampedDx = Math.max(-currentX, Math.min(dx, maxX - currentX));
      const clampedDy = Math.max(-currentY, Math.min(dy, maxY - currentY));
      onMove(clampedDx, clampedDy);
    }
  };



  // Toggle selection
  const toggleSelection = () => {
    setIsSelected(!isSelected);
  };

  return (
    <View
      style={[
        {
          borderWidth: 1,
          borderColor: '#CCCCCC',
          borderRadius: 8,
        },
        isSelected && {
          borderWidth: 2,
          borderColor: '#007AFF',
        },
        {
          width: dimensions.width,
          height: dimensions.height,
          // Positioning
          position: 'absolute',
          left: x ?? 0,
          top: y ?? 0,
        },
      ]}
      onLayout={onContainerLayout}
      {...imagePanResponder.panHandlers}
    >
      <Image
        source={{ uri }}
        style={[
          styles.image, 
          { width: dimensions.width, height: dimensions.height },
          isSelected && styles.selectedImage
        ]}
        resizeMode="contain"
      />
      {/* Only show controls when selected */}
      {isSelected && (
        <>
          {/* Delete button */}
          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={onDelete}
          >
            <IconButton
              icon="close-circle"
              size={24}
              iconColor="#FF3B30"
            />
          </TouchableOpacity>
          
          {/* Top-left resize handle */}
          <View 
            style={styles.topLeftHandle}
            {...topLeftResponder.panHandlers}
          >
            <MaterialCommunityIcons name="resize-bottom-right" size={16} color="#007AFF" style={{transform: [{rotate: '180deg'}]}} />
          </View>
          
          {/* Top-right resize handle */}
          <View 
            style={styles.topRightHandle}
            {...topRightResponder.panHandlers}
          >
            <MaterialCommunityIcons name="arrow-top-left" size={16} color="#007AFF" />
          </View>
          
          {/* Bottom-left resize handle */}
          <View 
            style={styles.bottomLeftHandle}
            {...bottomLeftResponder.panHandlers}
          >
            <MaterialCommunityIcons name="arrow-bottom-left" size={16} color="#007AFF" />
          </View>
          
          {/* Bottom-right resize handle */}
          <View 
            style={styles.bottomRightHandle}
            {...bottomRightResponder.panHandlers}
          >
            <MaterialCommunityIcons name="resize-bottom-right" size={16} color="#007AFF" />
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    margin: 10,
  },
  image: {
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 8,
  },
  selectedImage: {
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  deleteButton: {
    position: 'absolute',
    top: -12,
    right: -12,
    backgroundColor: 'white',
    borderRadius: 12,
    width: 24,
    height: 24,
    zIndex: 10,
  },
  // Corner resize handles
  topLeftHandle: {
    position: 'absolute',
    top: -10,
    left: -10,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#007AFF',
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  topRightHandle: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#007AFF',
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  bottomLeftHandle: {
    position: 'absolute',
    bottom: -10,
    left: -10,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#007AFF',
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  bottomRightHandle: {
    position: 'absolute',
    bottom: -10,
    right: -10,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#007AFF',
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
});
