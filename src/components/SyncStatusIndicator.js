// src/components/SyncStatusIndicator.js
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../utils/colors';
import syncService from '../utils/syncService';

const SyncStatusIndicator = () => {
  const [status, setStatus] = useState({
    isOnline: true,
    isSyncing: false,
    pendingOperations: 0
  });
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Initial status
    setStatus(syncService.getStatus());

    // Listen for sync events
    const unsubscribe = syncService.addListener((event) => {
      setStatus(syncService.getStatus());

      // Show user-friendly notifications
      switch (event.type) {
        case 'network_change':
          if (event.isOnline) {
            // Don't show "back online" message unless there are pending operations
            if (syncService.getStatus().pendingOperations > 0) {
              Alert.alert('📶 Back Online', 'Syncing your data...');
            }
          }
          break;
          
        case 'sync_complete':
          if (event.failedCount > 0) {
            Alert.alert(
              '⚠️ Sync Issues', 
              `${event.failedCount} items couldn't sync. They'll be retried later.`
            );
          }
          break;
          
        case 'operation_failed':
          console.warn('Operation failed after retries:', event.operation);
          break;
      }
    });

    return unsubscribe;
  }, []);

  const handleManualSync = async () => {
    try {
      await syncService.manualSync();
      Alert.alert('✅ Sync Complete', 'Your data is up to date');
    } catch (error) {
      Alert.alert('❌ Sync Failed', error.message);
    }
  };

  const getStatusText = () => {
    if (!status.isOnline) {
      return 'Offline';
    } else if (status.isSyncing) {
      return 'Syncing...';
    } else if (status.pendingOperations > 0) {
      return `${status.pendingOperations} pending`;
    } else {
      return 'Synced';
    }
  };

  const getStatusColor = () => {
    if (!status.isOnline) {
      return colors.error || '#ff4757';
    } else if (status.isSyncing) {
      return colors.warning || '#ffa502';
    } else if (status.pendingOperations > 0) {
      return colors.warning || '#ffa502';
    } else {
      return colors.success || '#2ed573';
    }
  };

  const getStatusIcon = () => {
    if (!status.isOnline) {
      return '📵';
    } else if (status.isSyncing) {
      return '🔄';
    } else if (status.pendingOperations > 0) {
      return '⏳';
    } else {
      return '✅';
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}
        onPress={() => setShowDetails(!showDetails)}
        activeOpacity={0.7}
      >
        <Text style={styles.statusIcon}>{getStatusIcon()}</Text>
        <Text style={styles.statusText}>{getStatusText()}</Text>
      </TouchableOpacity>

      {showDetails && (
        <View style={styles.detailsPanel}>
          <Text style={styles.detailsTitle}>Sync Status</Text>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Connection:</Text>
            <Text style={[styles.detailValue, { color: getStatusColor() }]}>
              {status.isOnline ? 'Online' : 'Offline'}
            </Text>
          </View>

          {status.pendingOperations > 0 && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Pending:</Text>
              <Text style={styles.detailValue}>{status.pendingOperations} items</Text>
            </View>
          )}

          {status.isOnline && status.pendingOperations > 0 && (
            <TouchableOpacity style={styles.syncButton} onPress={handleManualSync}>
              <Text style={styles.syncButtonText}>Sync Now</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowDetails(false)}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1000,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginHorizontal: 20,
    marginVertical: 5,
  },
  statusIcon: {
    fontSize: 12,
    marginRight: 6,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  detailsPanel: {
    position: 'absolute',
    top: 40,
    right: 20,
    left: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: colors.textLight,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  syncButton: {
    backgroundColor: colors.primary,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
    marginBottom: 8,
  },
  syncButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
  },
  closeButton: {
    paddingVertical: 4,
  },
  closeButtonText: {
    color: colors.textLight,
    textAlign: 'center',
    fontSize: 12,
  },
});

export default SyncStatusIndicator;