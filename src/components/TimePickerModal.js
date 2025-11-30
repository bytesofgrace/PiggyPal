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

const TimePickerModal = ({ visible, currentTime, onTimeChange, onClose }) => {
  const [hours, setHours] = useState(() => {
    const [h] = currentTime.split(':');
    return h;
  });
  
  const [minutes, setMinutes] = useState(() => {
    const [, m] = currentTime.split(':');
    return m;
  });

  const handleConfirm = () => {
    const h = parseInt(hours) || 0;
    const m = parseInt(minutes) || 0;
    
    if (h < 0 || h > 23) {
      Alert.alert('Invalid Hour', 'Please enter a hour between 0-23');
      return;
    }
    
    if (m < 0 || m > 59) {
      Alert.alert('Invalid Minutes', 'Please enter minutes between 0-59');
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
                      style={styles.timeInput}
                      value={hours}
                      onChangeText={setHours}
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
                      style={styles.timeInput}
                      value={minutes}
                      onChangeText={setMinutes}
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
                  <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
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