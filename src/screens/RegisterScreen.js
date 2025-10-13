// src/screens/RegisterScreen.js
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { auth, db } from '../config/firebase';
import { colors } from '../utils/colors';

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert('Oops!', 'Please fill in all fields! 📝');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Oops!', 'Passwords don\'t match! 🔑');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Oops!', 'Password should be at least 6 characters! 🔒');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Create user document in Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        name: name,
        email: email,
        createdAt: new Date().toISOString(),
        totalSavings: 0,
        totalSpending: 0,
      });

      Alert.alert('Success! 🎉', 'Welcome to PiggyPal!');
    } catch (error) {
      let message = 'Something went wrong! 😅';
      if (error.code === 'auth/email-already-in-use') {
        message = 'This email is already registered! Try logging in! 📧';
      } else if (error.code === 'auth/invalid-email') {
        message = 'Please enter a valid email! 📧';
      }
      Alert.alert('Registration Error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.emoji}>🌟</Text>
            <Text style={styles.title}>Join PiggyPal!</Text>
            <Text style={styles.subtitle}>Start your savings journey</Text>
          </View>

          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Your Name 👤"
              value={name}
              onChangeText={setName}
              placeholderTextColor={colors.textLight}
            />

            <TextInput
              style={styles.input}
              placeholder="Email Address 📧"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholderTextColor={colors.textLight}
            />

            <TextInput
              style={styles.input}
              placeholder="Password 🔒"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholderTextColor={colors.textLight}
            />

            <TextInput
              style={styles.input}
              placeholder="Confirm Password 🔑"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              placeholderTextColor={colors.textLight}
            />

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Creating Account... ⏳' : 'Sign Up 🚀'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.linkText}>
                Already have an account? Login! 👋
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  emoji: {
    fontSize: 70,
    marginBottom: 10,
  },
  title: {
    fontSize: 38,
    fontWeight: 'bold',
    color: colors.secondary,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textLight,
  },
  form: {
    width: '100%',
  },
  input: {
    backgroundColor: colors.white,
    borderRadius: 15,
    padding: 18,
    fontSize: 16,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: colors.secondary,
  },
  button: {
    backgroundColor: colors.secondary,
    borderRadius: 15,
    padding: 18,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  linkButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  linkText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});