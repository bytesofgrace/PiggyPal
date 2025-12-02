import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated
} from 'react-native';
import { colors } from '../utils/colors';

let alertInstance = null;

// Global function to show alerts
export const showCustomAlert = (title, message, buttons = [{ text: 'OK' }], options = {}) => {
  if (alertInstance) {
    alertInstance.show(title, message, buttons, options);
  }
};

const CustomAlert = () => {
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [buttons, setButtons] = useState([]);
  const [options, setOptions] = useState({});
  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    alertInstance = {
      show: (alertTitle, alertMessage, alertButtons = [{ text: 'OK' }], alertOptions = {}) => {
        setTitle(alertTitle);
        setMessage(alertMessage);
        setButtons(alertButtons);
        setOptions(alertOptions);
        setVisible(true);
        
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      }
    };

    return () => {
      alertInstance = null;
    };
  }, []);

  const handleButtonPress = (button) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
      if (button.onPress) {
        button.onPress();
      }
    });
  };

  const handleBackdropPress = () => {
    // Only close if there's a cancel button or single OK button
    if (buttons.length === 1 || buttons.some(btn => btn.style === 'cancel')) {
      handleButtonPress({ onPress: null });
    }
  };

  const renderButtons = () => {
    if (buttons.length === 1) {
      // Single button - full width
      return (
        <TouchableOpacity
          style={[styles.singleButton, getButtonStyle(buttons[0])]}
          onPress={() => handleButtonPress(buttons[0])}
          activeOpacity={0.7}
        >
          <Text style={[styles.buttonText, getButtonTextStyle(buttons[0])]}>{buttons[0].text}</Text>
        </TouchableOpacity>
      );
    }

    if (buttons.length === 2) {
      // Two buttons - side by side
      return (
        <View style={styles.twoButtonContainer}>
          {buttons.map((button, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.halfButton, getButtonStyle(button)]}
              onPress={() => handleButtonPress(button)}
              activeOpacity={0.7}
            >
              <Text style={[styles.buttonText, getButtonTextStyle(button)]}>{button.text}</Text>
            </TouchableOpacity>
          ))}
        </View>
      );
    }

    // Three or more buttons - vertical stack
    return (
      <View style={styles.multiButtonContainer}>
        {buttons.map((button, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.stackButton, getButtonStyle(button), index === buttons.length - 1 && { marginBottom: 0 }]}
            onPress={() => handleButtonPress(button)}
            activeOpacity={0.7}
          >
            <Text style={[styles.buttonText, getButtonTextStyle(button)]}>{button.text}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const getButtonStyle = (button) => {
    switch (button.style) {
      case 'cancel':
        return styles.cancelButton;
      case 'destructive':
        return styles.destructiveButton;
      default:
        return styles.defaultButton;
    }
  };

  const getButtonTextStyle = (button) => {
    switch (button.style) {
      case 'cancel':
        return styles.cancelButtonText;
      case 'destructive':
        return styles.destructiveButtonText;
      default:
        return styles.defaultButtonText;
    }
  };

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={handleBackdropPress}
    >
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1} 
        onPress={handleBackdropPress}
      >
        <Animated.View style={[styles.alertContainer, { opacity: fadeAnim }]}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={styles.alertContent}>
              {title ? <Text style={styles.title}>{title}</Text> : null}
              {message ? <Text style={styles.message}>{message}</Text> : null}
              {renderButtons()}
            </View>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  alertContainer: {
    width: '100%',
    maxWidth: 320,
  },
  alertContent: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 24,
  },
  message: {
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  singleButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  twoButtonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  halfButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  multiButtonContainer: {
    gap: 10,
  },
  stackButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  defaultButton: {
    backgroundColor: colors.primary,
  },
  defaultButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: colors.textLight,
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  destructiveButton: {
    backgroundColor: '#DC3545',
  },
  destructiveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CustomAlert;