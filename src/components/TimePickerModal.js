// src/components/TimePickerModal.js
import { useState } from 'react';
import {
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import { colors } from '../utils/colors';
import CustomAlert, { showCustomAlert } from './CustomAlert';

const TimePickerModal = ({ visible, currentTime, onTimeChange, onClose }) => {
  const [hours, setHours] = useState(() => {
    const [h] = currentTime.split(':');
    return h;
  });
  
  const [minutes, setMinutes] = useState(() => {
    const [, m] = currentTime.split(':');
    return m;
  });

  // Get input styles with validation colors
  const getHourInputStyle = () => {
    const baseStyle = styles.timeInput;
    if (hours === '') return baseStyle;
    
    const numValue = parseInt(hours);
    if (isNaN(numValue) || numValue < 0 || numValue > 23) {
      return [baseStyle, styles.timeInputError];
    }
    return [baseStyle, styles.timeInputValid];
  };

  const getMinuteInputStyle = () => {
    const baseStyle = styles.timeInput;
    if (minutes === '') return baseStyle;
    
    const numValue = parseInt(minutes);
    if (isNaN(numValue) || numValue < 0 || numValue > 59) {
      return [baseStyle, styles.timeInputError];
    }
    return [baseStyle, styles.timeInputValid];
  };

  // Validate and set hours (0-23)
  const handleHoursChange = (text) => {
    // Only allow numeric input
    const numericText = text.replace(/[^0-9]/g, '');
    
    if (numericText === '') {
      setHours('');
      return;
    }
    
    const numValue = parseInt(numericText);
    
    // Limit to valid range (0-23)
    if (numValue >= 0 && numValue <= 23) {
      setHours(numericText);
    } else if (numericText.length === 1) {
      // Allow single digit entry
      setHours(numericText);
    } else {
      // Cap at 23 for two-digit entries
      setHours('23');
    }
  };

  // Validate and set minutes (0-59)
  const handleMinutesChange = (text) => {
    // Only allow numeric input
    const numericText = text.replace(/[^0-9]/g, '');
    
    if (numericText === '') {
      setMinutes('');
      return;
    }
    
    const numValue = parseInt(numericText);
    
    // Limit to valid range (0-59)
    if (numValue >= 0 && numValue <= 59) {
      setMinutes(numericText);
    } else if (numericText.length === 1) {
      // Allow single digit entry
      setMinutes(numericText);
    } else {
      // Cap at 59 for two-digit entries
      setMinutes('59');
    }
  };

  const handleConfirm = () => {
    // Handle empty inputs
    if (hours === '' || minutes === '') {
      showCustomAlert('⚠️ Missing Time', 'Please enter both hours and minutes');
      return;
    }

    const h = parseInt(hours);
    const m = parseInt(minutes);
    
    // Double-check validation (should not be needed with input handlers)
    if (isNaN(h) || h < 0 || h > 23) {
      showCustomAlert('⚠️ Invalid Hour', 'Please enter an hour between 0-23');
      return;
    }
    
    if (isNaN(m) || m < 0 || m > 59) {
      showCustomAlert('⚠️ Invalid Minutes', 'Please enter minutes between 0-59');
      return;
    }
    
    const timeString = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    onTimeChange(timeString);
    onClose();
  };

  const formatTime = (h, m) => {
    const hour = parseInt(h) || 0;
    const minute = parseInt(m) || 0;
    const date = new Date();
    date.setHours(hour, minute, 0, 0);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // iOS modal
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={styles.modalContainer}>
              <ScrollView 
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>⏰ Daily Reminder Time</Text>
                  <Text style={styles.modalSubtitle}>
                    Enter the time (24-hour format)
                  </Text>
                </View>

                <View style={styles.timeInputContainer}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Hour (0-23)</Text>
                    <TextInput
                      style={getHourInputStyle()}
                      value={hours}
                      onChangeText={handleHoursChange}
                      keyboardType="number-pad"
                      maxLength={2}
                      placeholder="19"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                  
                  <Text style={styles.timeSeparator}>:</Text>
                  
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Minutes (0-59)</Text>
                    <TextInput
                      style={getMinuteInputStyle()}
                      value={minutes}
                      onChangeText={handleMinutesChange}
                      keyboardType="number-pad"
                      maxLength={2}
                      placeholder="00"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                </View>

                <View style={styles.timeDisplay}>
                  <Text style={styles.currentTimeLabel}>Preview:</Text>
                  <Text style={styles.currentTime}>{formatTime(hours, minutes)}</Text>
                </View>

                <View style={styles.buttonContainer}>
                  <TouchableOpacity style={styles.cancelButton} onPress={onClose} activeOpacity={0.7}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm} activeOpacity={0.7}>
                    <Text style={styles.confirmButtonText}>Set Time</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: 20,
  },
  timeDisplay: {
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 15,
    backgroundColor: colors.background,
    borderRadius: 12,
  },
  currentTimeLabel: {
    fontSize: 14,
    color: colors.textLight,
    marginBottom: 4,
  },
  currentTime: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
  timePicker: {
    marginVertical: 20,
  },
  pickerWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
    paddingVertical: 10,
  },
  timeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  inputGroup: {
    alignItems: 'center',
  },
  inputLabel: {
    fontSize: 12,
    color: colors.textLight,
    marginBottom: 8,
  },
  timeInput: {
    width: 80,
    height: 60,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 12,
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    color: colors.text,
    backgroundColor: '#f9f9f9',
  },
  timeInputValid: {
    borderColor: '#10B981', // Green for valid input
    backgroundColor: '#F0FDF4', // Light green background
  },
  timeInputError: {
    borderColor: '#EF4444', // Red for invalid input
    backgroundColor: '#FEF2F2', // Light red background
  },
  timeSeparator: {
    fontSize: 40,
    fontWeight: 'bold',
    color: colors.primary,
    marginHorizontal: 10,
    marginTop: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    backgroundColor: colors.textLight,
    marginRight: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    backgroundColor: colors.primary,
    marginLeft: 10,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default TimePickerModal;