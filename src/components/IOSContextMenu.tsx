import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable, Platform } from 'react-native';
import { useTheme } from 'react-native-paper';

interface IOSContextMenuProps {
  visible: boolean;
  onDismiss: () => void;
  position?: { x: number; y: number } | null;
  actions: {
    title: string;
    onPress: () => void;
    icon?: React.ReactNode;
    destructive?: boolean;
  }[];
}

const IOSContextMenu: React.FC<IOSContextMenuProps> = ({ 
  visible, 
  onDismiss, 
  position, 
  actions 
}) => {
  const { colors, dark } = useTheme();
  
  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <Pressable style={styles.overlay} onPress={onDismiss}>
        <View 
          style={[
            styles.menuContainer,
            {
              left: position?.x,
              top: position?.y,
              backgroundColor: dark ? 'rgba(50, 50, 50, 0.95)' : 'rgba(248, 248, 248, 0.95)',
              borderColor: dark ? 'rgba(70, 70, 70, 0.5)' : 'rgba(210, 210, 210, 0.5)',
            },
            Platform.OS === 'web' && position ? { position: 'absolute' } : {}
          ]}
        >
          {renderMenuItems()}
        </View>
      </Pressable>
    </Modal>
  );

  function renderMenuItems() {
    return (
      <>
        {actions.map((action, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.menuItem,
              index !== actions.length - 1 && styles.menuItemBorder
            ]}
            onPress={() => {
              onDismiss();
              action.onPress();
            }}
          >
            {action.icon && (
              <View style={styles.iconContainer}>
                {action.icon}
              </View>
            )}
            <Text 
              style={[
                styles.menuItemText, 
                { color: action.destructive ? '#FF3B30' : colors.onSurface }
              ]}
            >
              {action.title}
            </Text>
          </TouchableOpacity>
        ))}
      </>
    );
  }
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    position: 'absolute',
    width: 250,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 0.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  webPosition: {
    position: 'absolute',
  },
  blurContainer: {
    overflow: 'hidden',
    width: '100%',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuItemBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
  },
  menuItemText: {
    fontSize: 17,
    fontWeight: '500',
  },
  iconContainer: {
    marginRight: 12,
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default IOSContextMenu;
