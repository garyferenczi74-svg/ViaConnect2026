import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { supabase } from '../../src/lib/supabase/client';
import type { UserRole } from '../../src/lib/auth/store';

type SignupStep = 1 | 2 | 3 | 4 | 5;

interface SignupData {
  email: string;
  password: string;
  confirmPassword: string;
  role: UserRole;
  fullName: string;
  dateOfBirth: string;
  location: string;
  licenseNumber: string;
  licenseState: string;
  otp: string;
}

const ROLES: { value: UserRole; label: string; description: string; color: string }[] = [
  {
    value: 'consumer',
    label: 'Personal Wellness',
    description: 'Track your health journey with genomic insights',
    color: 'bg-teal',
  },
  {
    value: 'practitioner',
    label: 'Practitioner',
    description: 'Manage patients and prescribe protocols',
    color: 'bg-portal-green',
  },
  {
    value: 'naturopath',
    label: 'Naturopath',
    description: 'Botanical formulations and constitutional typing',
    color: 'bg-plum',
  },
];

export default function SignupScreen() {
  const router = useRouter();
  const [step, setStep] = useState<SignupStep>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  const [data, setData] = useState<SignupData>({
    email: '',
    password: '',
    confirmPassword: '',
    role: 'consumer',
    fullName: '',
    dateOfBirth: '',
    location: '',
    licenseNumber: '',
    licenseState: '',
    otp: '',
  });

  const updateField = useCallback(
    <K extends keyof SignupData>(key: K, value: SignupData[K]) => {
      setData((prev) => ({ ...prev, [key]: value }));
      setError(null);
    },
    [],
  );

  const totalSteps = data.role === 'consumer' ? 4 : 5;
  const progress = (step / totalSteps) * 100;

  // Whether we need the license step (step 3 for practitioners/naturopaths)
  const needsLicenseStep = data.role !== 'consumer';

  const validateStep = (): boolean => {
    switch (step) {
      case 1:
        if (!data.email.trim()) {
          setError('Email is required.');
          return false;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
          setError('Please enter a valid email address.');
          return false;
        }
        if (data.password.length < 8) {
          setError('Password must be at least 8 characters.');
          return false;
        }
        if (data.password !== data.confirmPassword) {
          setError('Passwords do not match.');
          return false;
        }
        return true;
      case 2:
        if (!data.fullName.trim()) {
          setError('Full name is required.');
          return false;
        }
        if (!data.dateOfBirth.trim()) {
          setError('Date of birth is required.');
          return false;
        }
        return true;
      case 3:
        if (needsLicenseStep) {
          if (!data.licenseNumber.trim()) {
            setError('License number is required for verification.');
            return false;
          }
          if (!data.licenseState.trim()) {
            setError('License state is required.');
            return false;
          }
        }
        return true;
      default:
        return true;
    }
  };

  const handleSignUp = useCallback(async () => {
    setError(null);
    setIsLoading(true);

    try {
      // Supabase sends a 6-digit confirmation code automatically when
      // enable_confirmations = true in the dashboard.
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email.trim(),
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
            role: data.role === 'consumer' ? 'patient' : data.role,
          },
        },
      });

      if (authError) {
        // If user already registered but unconfirmed, resend the code
        if (authError.message.includes('already registered')) {
          await supabase.auth.resend({ type: 'signup', email: data.email.trim() });
        } else {
          setError(authError.message);
          return;
        }
      }

      if (authData?.user) {
        // Map app roles to DB roles: consumer→patient, naturopath→practitioner
        const dbRole = data.role === 'consumer' ? 'patient' as const : 'practitioner' as const;

        // Create profile record
        await supabase.from('profiles').upsert({
          id: authData.user.id,
          full_name: data.fullName,
          role: dbRole,
          onboarding_completed: false,
        });
      }

      // Move to OTP verification step
      const otpStep = needsLicenseStep ? 4 : 3;
      setStep(otpStep as SignupStep);
    } catch {
      setError('Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [data, needsLicenseStep]);

  const handleVerifyOTP = useCallback(async () => {
    if (data.otp.length < 6) {
      setError('Please enter the 6-digit code.');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      // Verify with Supabase's built-in OTP verification
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: data.email.trim(),
        token: data.otp,
        type: 'email',
      });

      if (verifyError) {
        setError(verifyError.message);
        return;
      }

      // verifyOtp automatically signs the user in — no need to call signInWithPassword

      // Redirect based on role
      if (data.role === 'consumer') {
        router.replace({
          pathname: '/(auth)/onboarding/[step]',
          params: { step: '1' },
        });
      } else {
        router.replace(
          data.role === 'practitioner'
            ? '/(practitioner)'
            : '/(naturopath)' as never,
        );
      }
    } catch {
      setError('Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [data.otp, data.email, data.role, router]);

  const handleResendCode = useCallback(async () => {
    if (resendCooldown > 0) return;

    setError(null);
    setIsLoading(true);

    try {
      // Resend via Supabase's built-in email
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: data.email.trim(),
      });

      if (resendError) {
        setError(resendError.message);
        return;
      }

      // Start 60-second cooldown
      setResendCooldown(60);
    } catch {
      setError('Failed to resend code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [data.email, resendCooldown]);

  // Cooldown timer
  const cooldownRef = useRef<ReturnType<typeof setInterval>>();
  useEffect(() => {
    if (resendCooldown > 0) {
      cooldownRef.current = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(cooldownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(cooldownRef.current);
    }
  }, [resendCooldown]);

  const handleNext = async () => {
    if (!validateStep()) return;

    // Determine the actual step for OTP (depends on role)
    const otpStep = needsLicenseStep ? 4 : 3;

    if (step === otpStep) {
      // We're on OTP verification step
      await handleVerifyOTP();
      return;
    }

    // If we're on the step right before OTP, do the signup
    const signupStep = needsLicenseStep ? 3 : 2;
    if (step === signupStep) {
      await handleSignUp();
      return;
    }

    // Skip license step for consumers
    if (step === 2 && !needsLicenseStep) {
      await handleSignUp();
      return;
    }

    setStep((step + 1) as SignupStep);
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((step - 1) as SignupStep);
      setError(null);
    } else {
      router.back();
    }
  };

  // Determine the actual OTP step number
  const otpStepNum = needsLicenseStep ? 4 : 3;
  const completionStepNum = needsLicenseStep ? 5 : 4;
  const isOTPStep = step === otpStepNum;
  const isCompletionStep = step === completionStepNum;

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-dark-bg"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Progress Bar */}
      <View className="h-1.5 bg-dark-border mx-4 mt-2 rounded-full overflow-hidden">
        <View
          className="h-full bg-copper rounded-full"
          style={{ width: `${progress}%` }}
          accessibilityLabel={`Step ${step} of ${totalSteps}`}
          accessibilityRole="progressbar"
        />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="flex-grow px-6 py-6"
        keyboardShouldPersistTaps="handled"
      >
        {/* Step 1: Email + Password + Role */}
        {step === 1 && (
          <Animated.View entering={FadeInRight.duration(300)} exiting={FadeOutLeft.duration(200)} className="gap-5">
            <View>
              <Text className="text-white text-2xl font-bold">Create Account</Text>
              <Text className="text-gray-400 text-sm mt-1">
                Step 1 — Email, password & portal selection
              </Text>
            </View>

            <View>
              <Text className="text-gray-300 text-sm font-medium mb-1.5">Email</Text>
              <TextInput
                className="bg-dark-card border border-dark-border rounded-xl px-4 py-3.5 text-white"
                value={data.email}
                onChangeText={(v) => updateField('email', v)}
                placeholder="you@example.com"
                placeholderTextColor="#4B5563"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                accessibilityLabel="Email address"
              />
            </View>

            <View>
              <Text className="text-gray-300 text-sm font-medium mb-1.5">Password</Text>
              <TextInput
                className="bg-dark-card border border-dark-border rounded-xl px-4 py-3.5 text-white"
                value={data.password}
                onChangeText={(v) => updateField('password', v)}
                placeholder="Min 8 characters"
                placeholderTextColor="#4B5563"
                secureTextEntry
                autoCapitalize="none"
                accessibilityLabel="Password"
              />
            </View>

            <View>
              <Text className="text-gray-300 text-sm font-medium mb-1.5">Confirm Password</Text>
              <TextInput
                className="bg-dark-card border border-dark-border rounded-xl px-4 py-3.5 text-white"
                value={data.confirmPassword}
                onChangeText={(v) => updateField('confirmPassword', v)}
                placeholder="Re-enter password"
                placeholderTextColor="#4B5563"
                secureTextEntry
                autoCapitalize="none"
                accessibilityLabel="Confirm password"
              />
            </View>

            {/* Role Selection */}
            <View>
              <Text className="text-gray-300 text-sm font-medium mb-3">Select Your Portal</Text>
              <View className="gap-3">
                {ROLES.map((r) => {
                  const isSelected = data.role === r.value;
                  return (
                    <Pressable
                      key={r.value}
                      className={`rounded-xl p-4 border-2 ${
                        isSelected
                          ? `${r.color} border-transparent`
                          : 'bg-dark-card border-dark-border'
                      } active:opacity-80`}
                      onPress={() => updateField('role', r.value)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: isSelected }}
                      accessibilityLabel={r.label}
                    >
                      <Text
                        className={`text-base font-semibold ${
                          isSelected && r.value === 'practitioner'
                            ? 'text-dark-bg'
                            : 'text-white'
                        }`}
                      >
                        {r.label}
                      </Text>
                      <Text
                        className={`text-xs mt-0.5 ${
                          isSelected && r.value === 'practitioner'
                            ? 'text-dark-bg/70'
                            : 'text-gray-400'
                        }`}
                      >
                        {r.description}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </Animated.View>
        )}

        {/* Step 2: Profile Basics */}
        {step === 2 && (
          <Animated.View entering={FadeInRight.duration(300)} exiting={FadeOutLeft.duration(200)} className="gap-5">
            <View>
              <Text className="text-white text-2xl font-bold">Profile Basics</Text>
              <Text className="text-gray-400 text-sm mt-1">
                Step 2 — Name, date of birth & location
              </Text>
            </View>

            <View>
              <Text className="text-gray-300 text-sm font-medium mb-1.5">Full Name</Text>
              <TextInput
                className="bg-dark-card border border-dark-border rounded-xl px-4 py-3.5 text-white"
                value={data.fullName}
                onChangeText={(v) => updateField('fullName', v)}
                placeholder="Your full name"
                placeholderTextColor="#4B5563"
                autoComplete="name"
                accessibilityLabel="Full name"
              />
            </View>

            <View>
              <Text className="text-gray-300 text-sm font-medium mb-1.5">Date of Birth</Text>
              <TextInput
                className="bg-dark-card border border-dark-border rounded-xl px-4 py-3.5 text-white"
                value={data.dateOfBirth}
                onChangeText={(v) => updateField('dateOfBirth', v)}
                placeholder="MM/DD/YYYY"
                placeholderTextColor="#4B5563"
                keyboardType="numbers-and-punctuation"
                accessibilityLabel="Date of birth"
              />
            </View>

            <View>
              <Text className="text-gray-300 text-sm font-medium mb-1.5">Location</Text>
              <TextInput
                className="bg-dark-card border border-dark-border rounded-xl px-4 py-3.5 text-white"
                value={data.location}
                onChangeText={(v) => updateField('location', v)}
                placeholder="City, State"
                placeholderTextColor="#4B5563"
                accessibilityLabel="Location"
              />
            </View>
          </Animated.View>
        )}

        {/* Step 3: License Verification (practitioners/naturopaths only) */}
        {step === 3 && needsLicenseStep && (
          <Animated.View entering={FadeInRight.duration(300)} exiting={FadeOutLeft.duration(200)} className="gap-5">
            <View>
              <Text className="text-white text-2xl font-bold">License Verification</Text>
              <Text className="text-gray-400 text-sm mt-1">
                Step 3 — Professional credentials
              </Text>
            </View>

            <View className="bg-teal/20 rounded-xl p-4">
              <Text className="text-teal-light text-sm">
                Your license will be verified before granting full portal access.
                This typically takes 1-2 business days.
              </Text>
            </View>

            <View>
              <Text className="text-gray-300 text-sm font-medium mb-1.5">License Number</Text>
              <TextInput
                className="bg-dark-card border border-dark-border rounded-xl px-4 py-3.5 text-white"
                value={data.licenseNumber}
                onChangeText={(v) => updateField('licenseNumber', v)}
                placeholder="Enter your license number"
                placeholderTextColor="#4B5563"
                autoCapitalize="characters"
                accessibilityLabel="License number"
              />
            </View>

            <View>
              <Text className="text-gray-300 text-sm font-medium mb-1.5">Licensing State</Text>
              <TextInput
                className="bg-dark-card border border-dark-border rounded-xl px-4 py-3.5 text-white"
                value={data.licenseState}
                onChangeText={(v) => updateField('licenseState', v)}
                placeholder="e.g., NY, CA"
                placeholderTextColor="#4B5563"
                autoCapitalize="characters"
                maxLength={2}
                accessibilityLabel="License state"
              />
            </View>
          </Animated.View>
        )}

        {/* OTP Verification Step */}
        {isOTPStep && (
          <Animated.View entering={FadeInRight.duration(300)} exiting={FadeOutLeft.duration(200)} className="gap-5">
            <View>
              <Text className="text-white text-2xl font-bold">Verify Email</Text>
              <Text className="text-gray-400 text-sm mt-1">
                Step {otpStepNum} — Enter the code sent to {data.email}
              </Text>
            </View>

            <View className="items-center py-4">
              <Text className="text-5xl mb-4">📬</Text>
              <Text className="text-gray-300 text-center text-sm">
                We sent a 6-digit verification code to{'\n'}
                <Text className="text-copper font-semibold">{data.email}</Text>
              </Text>
            </View>

            <TextInput
              className="bg-dark-card border border-dark-border rounded-xl px-6 py-4 text-white text-center text-2xl font-mono tracking-[8px]"
              value={data.otp}
              onChangeText={(v) => updateField('otp', v.replace(/[^0-9]/g, '').slice(0, 6))}
              placeholder="000000"
              placeholderTextColor="#4B5563"
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
              accessibilityLabel="Verification code"
            />

            <Pressable
              className="items-center py-2"
              onPress={handleResendCode}
              disabled={resendCooldown > 0 || isLoading}
              accessibilityLabel="Resend verification code"
            >
              <Text className={`text-sm ${resendCooldown > 0 ? 'text-gray-500' : 'text-copper'}`}>
                {resendCooldown > 0 ? `Resend Code (${resendCooldown}s)` : 'Resend Code'}
              </Text>
            </Pressable>
          </Animated.View>
        )}

        {/* Error */}
        {error && (
          <Animated.View entering={FadeIn.duration(200)} className="mt-4">
            <Text className="text-red-400 text-sm text-center">{error}</Text>
          </Animated.View>
        )}
      </ScrollView>

      {/* Navigation Footer */}
      <View className="bg-dark-bg border-t border-dark-border px-6 py-4 flex-row gap-3">
        <Pressable
          className="flex-1 bg-dark-card rounded-xl py-3.5 items-center active:opacity-80"
          onPress={handleBack}
          accessibilityLabel="Go back"
        >
          <Text className="text-white font-semibold">Back</Text>
        </Pressable>

        <Pressable
          className={`flex-1 rounded-xl py-3.5 items-center active:opacity-80 ${
            isLoading ? 'bg-copper/60' : 'bg-copper'
          }`}
          onPress={handleNext}
          disabled={isLoading}
          accessibilityLabel={isOTPStep ? 'Verify' : 'Continue'}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text className="text-white font-semibold">
              {isOTPStep ? 'Verify' : 'Continue'}
            </Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
