// src/components/ReminderConfigModal.js
import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import {
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import { colors } from '../utils/colors';

const DAYS_OF_WEEK = [
  { id: 1, name: 'Sunday', short: 'Sun' },
  { id: 2, name: 'Monday', short: 'Mon' },
  { id: 3, name: 'Tuesday', short: 'Tue' },
  { id: 4, name: 'Wednesday', short: 'Wed' },
  { id: 5, name: 'Thursday', short: 'Thu' },
  { id: 6, name: 'Friday', short: 'Fri' },
  { id: 7, name: 'Saturday', short: 'Sat' }
];

export default function ReminderConfigModal({ 
  visible, 
  onClose, 
  onSave, 
  initialConfig = { type: 'daily', time: '19:00', days: [2, 3, 4, 5, 6] } 
}) {
  const [reminderType, setReminderType] = useState(initialConfig.type);
  const [reminderTime, setReminderTime] = useState(initialConfig.time);
  const [selectedDays, setSelectedDays] = useState(initialConfig.days);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const timeToDate = (timeString) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  const dateToTime = (date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const handleTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const timeString = dateToTime(selectedTime);
      setReminderTime(timeString);
    }
  };

  const toggleDay = (dayId) => {
    setSelectedDays(prev => 
      prev.includes(dayId) 
        ? prev.filter(id => id !== dayId)
        : [...prev, dayId].sort()
    );
  };

  const handleSave = () => {
    if (reminderType === 'weekly' && selectedDays.length === 0) {
      Alert.alert('Error', 'Please select at least one day for weekly reminders.');
      return;
    }

    const config = {
      type: reminderType,
      time: reminderTime,
      days: selectedDays,
      title: '💰 PiggyPal Reminder',
      message: getTypeSpecificMessage(reminderType)
    };

    onSave(config);
    onClose();
  };

  const getTypeSpecificMessage = (type) => {
    switch (type) {
      case 'daily':
        return 'Time to check your daily savings progress! Keep building that wealth! 🐷';
      case 'weekly':
        return 'Weekly savings check-in! How much have you saved this week? 📊';
      case 'once':
        return 'Special savings reminder! Don\'t forget to track your progress! ✨';
      default:
        return 'Time to check your savings progress!';
    }
  };

  const formatTime = (time) => {
    const [hours, minutes] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={styles.modalContainer}>
              <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <Text style={styles.title}>⏰ Configure Reminder</Text>
                
                {/* Reminder Type Selection */}
                <Text style={styles.sectionTitle}>Reminder Frequency:</Text>
                <View style={styles.typeSelector}>
                  {['once', 'daily', 'weekly'].map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.typeOption,
                        reminderType === type && styles.typeOptionSelected
                      ]}
                      onPress={() => setReminderType(type)}
                    >
                      <Text style={[
                        styles.typeText,
                        reminderType === type && styles.typeTextSelected
                      ]}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Time Selection */}
                <Text style={styles.sectionTitle}>Reminder Time:</Text>
                <TouchableOpacity 
                  style={styles.timeSelector}
                  onPress={() => setShowTimePicker(true)}
                >
                  <Text style={styles.timeText}>{formatTime(reminderTime)}</Text>
                  <Text style={styles.changeText}>Tap to change</Text>
                </TouchableOpacity>

                {/* Days Selection (for weekly) */}
                {reminderType === 'weekly' && (
                  <>
                    <Text style={styles.sectionTitle}>Select Days:</Text>
                    <View style={styles.daysContainer}>
                      {DAYS_OF_WEEK.map((day) => (
                        <TouchableOpacity
                          key={day.id}
                          style={[
                            styles.dayOption,
                            selectedDays.includes(day.id) && styles.dayOptionSelected
                          ]}
                          onPress={() => toggleDay(day.id)}
                        >
                          <Text style={[
                            styles.dayText,
                            selectedDays.includes(day.id) && styles.dayTextSelected
                          ]}>
                            {day.short}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}

                {/* Preview */}
                <Text style={styles.sectionTitle}>Preview:</Text>
                <View style={styles.previewContainer}>
                  <Text style={styles.previewTitle}>💰 PiggyPal Reminder</Text>
                  <Text style={styles.previewMessage}>
                    {getTypeSpecificMessage(reminderType)}
                  </Text>
                  <Text style={styles.previewTime}>
                    {reminderType === 'weekly' 
                      ? `${selectedDays.map(id => DAYS_OF_WEEK.find(d => d.id === id)?.short).join(', ')} at ${formatTime(reminderTime)}`
                      : `${reminderType === 'daily' ? 'Daily' : 'Once'} at ${formatTime(reminderTime)}`
                    }
                  </Text>
                </View>

                {/* Buttons */}
                <View style={styles.buttonContainer}>
                  <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                    <Text style={styles.saveButtonText}>Save Reminder</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>

              {/* Time Picker */}
              {showTimePicker && (
                <DateTimePicker
                  value={timeToDate(reminderTime)}
                  mode="time"
                  is24Hour={false}
                  display="spinner"
                  onChange={handleTimeChange}
                />
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  modalContent: {
    maxHeight: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 20,
    marginBottom: 12,
  },
  typeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  typeOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: colors.lightGray,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  typeOptionSelected: {
    backgroundColor: colors.primary,
  },
  typeText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '600',
  },
  typeTextSelected: {
    color: 'white',
  },
  timeSelector: {
    backgroundColor: colors.lightGray,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  timeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
  },
  changeText: {
    fontSize: 14,
    color: colors.textLight,
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  dayOption: {
    width: 45,
    height: 45,
    backgroundColor: colors.lightGray,
    borderRadius: 22.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  dayOptionSelected: {
    backgroundColor: colors.primary,
  },
  dayText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  dayTextSelected: {
    color: 'white',
  },
  previewContainer: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    marginBottom: 20,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  previewMessage: {
    fontSize: 14,
    color: colors.textLight,
    lineHeight: 20,
    marginBottom: 8,
  },
  previewTime: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: colors.lightGray,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: colors.primary,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});