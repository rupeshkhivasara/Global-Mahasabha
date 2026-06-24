import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import LoginScreen from './auth/LoginScreen';
import RegisterScreen from './auth/RegisterScreen';
import ForgotPasswordScreen from './auth/ForgotPasswordScreen';
import VerifyOtpScreen from './auth/VerifyOtpScreen';
import DashboardScreen from './DashboardScreen';

// ── Navigation types ──────────────────────────────────────────────────────────

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  VerifyOTP: { mobile: string };
};

type AppStackParamList = {
  Dashboard: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack  = createNativeStackNavigator<AppStackParamList>();

// ── Root navigator (auth-gated) ───────────────────────────────────────────────

export default function RootNavigator() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fdf5f5' }}>
        <ActivityIndicator size="large" color="#e11d2a" />
      </View>
    );
  }

  if (user) {
    return (
      <AppStack.Navigator screenOptions={{ headerShown: false }}>
        <AppStack.Screen name="Dashboard" component={DashboardScreen} />
      </AppStack.Navigator>
    );
  }

  return (
    <AuthStack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName="Login">
      <AuthStack.Screen 
        name="Login"          
        component={LoginScreen} />
      <AuthStack.Screen 
        name="Register"       
        component={RegisterScreen} />
      <AuthStack.Screen 
        name="ForgotPassword" 
        component={ForgotPasswordScreen} />
      <AuthStack.Screen 
        name="VerifyOTP"      
        component={VerifyOtpScreen} />
    </AuthStack.Navigator>
  );
}
