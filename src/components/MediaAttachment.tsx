import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ScrollView, Image, Dimensions } from 'react-native';
import { IconButton, useTheme, Snackbar } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { ResizableImage } from './ResizableImage';
import { useTranslation } from 'react-i18next';

interface MediaAttachmentProps {
  onImageAdded?: (uri: string, width: number, height: number, x: number, y: number) => void;
  attachments: Array<{
    id: string;
    uri: string;
    width: number;
    height: number;
    x: number;
    y: number;
  }>;
  onImageDeleted?: (id: string) => void;
  onImageResized?: (id: string, width: number, height: number) => void;
  onImageMoved?: (id: string, x: number, y: number) => void;
}

const MediaAttachment: React.FC<MediaAttachmentProps> = ({
  onImageAdded,
  attachments = [],
  onImageDeleted,
  onImageResized,
  onImageMoved,
}) => {
  const [snackbarVisible, setSnackbarVisible] = React.useState(false);
  const [snackbarMsg, setSnackbarMsg] = React.useState('');
  const { colors } = useTheme();
  const c = colors as any;
  const { t } = useTranslation();
  
  // Get screen dimensions
  const screenWidth = Dimensions.get('window').width - 40; // Subtract padding
  
  // Function to resize image to fit screen
  const getImageDimensions = (uri: string): Promise<{width: number, height: number}> => {
    return new Promise((resolve) => {
      Image.getSize(uri, (width, height) => {
        resolve({ width, height });
      }, () => {
        // If there's an error, use default dimensions
        resolve({ width: 200, height: 200 });
      });
    });
  };
  
  // Handle image selection
  const handleImageSelected = async (uri: string) => {
    try {
      // Get original image dimensions
      const { width, height } = await getImageDimensions(uri);
      
      // Calculate scaled dimensions to fit the screen
      const aspectRatio = width / height;
      
      let newWidth = Math.min(width, screenWidth);
      let newHeight = newWidth / aspectRatio;
      
      // Call the callback with the resized image
      if (onImageAdded) {
        onImageAdded(
          uri,
          newWidth,
          newHeight,
          0, // Initial X position
          0  // Initial Y position
        );
      }
    } catch (error) {
      console.error('Error processing image:', error);
      // Use default dimensions if there's an error
      if (onImageAdded) {
        onImageAdded(uri, 200, 200, 0, 0);
      }
    }
  };
  
  // Pick an image from the gallery
  const pickImage = async () => {
    // Request permission to access the media library
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      setSnackbarMsg(t('media_permission_denied', 'Необходимо разрешение для доступа к галерее'));
      setSnackbarVisible(true);
      return;
    }
    
    // Launch the image picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      handleImageSelected(asset.uri);
    }
  };

  // Take a photo with the camera
  const takePhoto = async () => {
    // Request permission to access the camera
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      setSnackbarMsg(t('camera_permission_denied', 'Необходимо разрешение для доступа к камере'));
      setSnackbarVisible(true);
      return;
    }
    
    // Launch the camera
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      // Use the same handleImageSelected function for consistent resizing
      handleImageSelected(asset.uri);
    }
  };

  return (
    <View style={styles.container}>
      {/* Media attachment options */}
      <View style={[styles.optionsContainer, { backgroundColor: c.surface }]}>
        <TouchableOpacity 
          style={styles.option} 
          onPress={pickImage}
        >
          <IconButton icon="image" size={24} iconColor={c.primary} />
          <Text style={[styles.optionText, { color: c.text }]}>
            {t('gallery', 'Галерея')}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.option} 
          onPress={takePhoto}
        >
          <IconButton icon="camera" size={24} iconColor={c.primary} />
          <Text style={[styles.optionText, { color: c.text }]}>
            {t('camera', 'Камера')}
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Attached media preview */}
      {attachments.length > 0 && (
        <ScrollView 
          horizontal 
          style={styles.previewContainer}
          showsHorizontalScrollIndicator={false}
        >
          {attachments.map((attachment) => (
            <View key={attachment.id} style={styles.previewItem}>
              <ResizableImage
                uri={attachment.uri}
                initialWidth={attachment.width}
                initialHeight={attachment.height}
                onDelete={() => onImageDeleted && onImageDeleted(attachment.id)}
                onResize={(width, height) => 
                  onImageResized && onImageResized(attachment.id, width, height)
                }
                onMove={(x, y) => 
                  onImageMoved && onImageMoved(attachment.id, x, y)
                }
              />
            </View>
          ))}
        </ScrollView>
      )}
    {/* Snackbar for permission denied */}
    <Snackbar
      visible={snackbarVisible}
      onDismiss={() => setSnackbarVisible(false)}
      duration={3500}
      action={{ label: 'OK', onPress: () => setSnackbarVisible(false) }}
      style={{ backgroundColor: '#FF5252' }}
    >
      {snackbarMsg}
    </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  optionsContainer: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  optionText: {
    fontSize: 14,
  },
  previewContainer: {
    flexDirection: 'row',
    marginVertical: 8,
  },
  previewItem: {
    marginRight: 8,
  },
});

export default MediaAttachment;
