// Temporary simple LoginScreen without Firebase
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (email && password) {
      try {
        // Check if user exists
        const userData = await AsyncStorage.getItem(`user_${email}`);
        if (userData) {
          const user = JSON.parse(userData);
          if (user.password === password) {
            // Save current user email and name
            await AsyncStorage.setItem('currentUser', email);
            await AsyncStorage.setItem('currentUserName', user.name || 'Friend');
            
            // Simple navigation to MainTabs
            navigation.navigate('MainTabs');
            
          } else {
            Alert.alert('Error', 'Invalid password');
          }
        } else {
          Alert.alert('Error', 'No account found with this email. Please register first.');
        }
      } catch (error) {
        Alert.alert('Error', 'Login failed. Please try again.');
      }
    } else {
      Alert.alert('Error', 'Please enter both email and password');
    }
  };

  const handleForgotPassword = () => {
    Alert.prompt(
      '🔐 Forgot Password?',
      'Enter your registered email address:',
      async (inputEmail) => {
        if (!inputEmail) {
          Alert.alert('Error', 'Please enter your email address');
          return;
        }

        try {
          const userDataString = await AsyncStorage.getItem(`user_${inputEmail}`);
          
          if (!userDataString) {
            Alert.alert(
              'Email Not Found',
              'No account found with this email address. Please check your email or create a new account.',
              [{ text: 'OK' }]
            );
            return;
          }

          const userData = JSON.parse(userDataString);
          
          // Generate a temporary password
          const tempPassword = `Temp${Math.floor(Math.random() * 10000)}!`;
          
          // Update user's password to temporary password
          userData.password = tempPassword;
          userData.mustChangePassword = true;
          userData.updatedAt = new Date().toISOString();
          
          await AsyncStorage.setItem(`user_${inputEmail}`, JSON.stringify(userData));
          
          // Show the temporary password
          Alert.alert(
            'Password Reset',
            `Your temporary password is: ${tempPassword}\n\nPlease use this to login, then change your password in Settings.`,
            [
              {
                text: 'Copy Password',
                onPress: () => {
                  setPassword(tempPassword);
                }
              },
              { text: 'OK' }
            ]
          );
          
        } catch (error) {
          Alert.alert('Error', 'Failed to reset password. Please try again.');
        }
      },
      'plain-text',
      '',
      'email-address'
    );
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.formContainer}>
          <View style={styles.headerContainer}>
            <Text style={styles.piggyEmoji}>🐷</Text>
          </View>
          <Text style={styles.title}>Welcome to Piggy Pal!</Text>
        
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor="#9CA3AF"
        />
        
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholderTextColor="#9CA3AF"
        />
        
        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>Login</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.forgotPasswordButton} 
          onPress={handleForgotPassword}
        >
          <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.linkButton} 
          onPress={() => navigation.navigate('Register')}
        >
          <Text style={styles.linkText}>Don't have an account? Register</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FF6B9D',
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  headerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  piggyEmoji: {
    fontSize: 80,
    textAlign: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 40,
  },
  input: {
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 15,
    borderRadius: 10,
    fontSize: 16,
  },
  button: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
  },
  buttonText: {
    color: '#FF6B9D',
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
  },
  forgotPasswordButton: {
    marginTop: 15,
    alignItems: 'center',
  },
  forgotPasswordText: {
    color: 'white',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  linkButton: {
    marginTop: 20,
  },
  linkText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
  },
});