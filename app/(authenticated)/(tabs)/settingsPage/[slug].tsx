import TextInput from '@/components/CustomTextInput'
import DatePickerModal from '@/components/dashboard/DatePickerModal'
import { gray, primary } from '@/constants/colors'
import { api } from '@/convex/_generated/api'
import { Doc } from '@/convex/_generated/dataModel'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery } from 'convex/react'
import { format } from 'date-fns'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import React, { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native'
import Text from '@/components/CustomText'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as z from 'zod'

const focusOptions = [
  { id: 'reduce_sugar', label: 'Cut Sugar', icon: '🍬' },
  { id: 'limit_caffeine', label: 'Limit Caffeine', icon: '☕' },
  { id: 'drink_more_water', label: 'Drink More Water', icon: '💧' },
  { id: 'quit_alcohol', label: 'Cut Alcohol', icon: '🍺' },
  { id: 'just_track', label: 'Just Track', icon: '📊' },
]

const motivationOptions = [
  { id: 'better_sleep', label: 'Better Sleep', icon: '💤' },
  { id: 'improve_savings', label: 'Improve Savings', icon: '💰' },
  { id: 'steady_energy', label: 'Steady Energy', icon: '⚡' },
  { id: 'body_transformation', label: 'Body Transformation', icon: '🏗️' },
  { id: 'radiant_health', label: 'Radiant Health', icon: '✨' },
  { id: 'mindful_sipping', label: 'Mindful Sipping', icon: '🧘' },
  { id: 'total_sobriety', label: 'Total Sobriety', icon: '🏆' },
]

// 1. Define the schema based on your Convex 'users' table
const profileSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .optional(),
  name: z.string().min(3, 'Name must be at least 3 characters'),
  height: z.coerce.number(),
  weight: z.coerce.number(),
  gender: z.string(),
  birthDate: z.number(),
})
// 2. Extract the type from the schema
type ProfileFormValues = z.infer<typeof profileSchema>

const EditProfile = ({ user }: { user: Doc<'users'> }) => {
  const router = useRouter()
  const [profileImage, setProfileImage] = useState<string | undefined>(
    user.image,
  )
  const [mimeType, setMimeType] = useState<string | undefined>()
  const [gender, setGender] = useState(user.gender)
  const [birthDate, setBirthDate] = useState<number>(
    user.birthDate && !isNaN(user.birthDate) ? user.birthDate : Date.now(),
  )
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const { control, handleSubmit, setValue, watch } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: user.username,
      name: user.name,
      height: user.height ?? 0,
      weight: user.weight ?? 0,
      gender: gender,
      birthDate: birthDate,
    },
  })

  // Watch the real-time username typed by the user
  const watchedUsername = watch('username') || ''
  const [debouncedUsername, setDebouncedUsername] = useState(watchedUsername)

  // Debounce the typed username to avoid slamming the database on every keystroke
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedUsername(watchedUsername.toLowerCase().trim())
    }, 500)
    return () => clearTimeout(timer)
  }, [watchedUsername])

  const isSameAsCurrent =
    debouncedUsername === user.username?.toLowerCase().trim()

  const checkUsernameAvailable = useQuery(
    api.users.checkUsernameAvailability,
    isSameAsCurrent ? 'skip' : { username: debouncedUsername },
  )

  // We explicitly consider the username "available" if it's identical to the user's current username!
  const isUsernameAvailable = isSameAsCurrent ? true : checkUsernameAvailable

  const updateProfile = useMutation(api.users.updateProfileData)
  const generateUploadUrl = useMutation(api.images.generateUploadUrl)

  const onSubmit = async (data: ProfileFormValues) => {
    setIsSaving(true)
    try {
      let storageId = undefined

      // If profile image was changed and is a local file
      if (
        profileImage &&
        profileImage !== user.image &&
        !profileImage.startsWith('http')
      ) {
        const uploadUrl = await generateUploadUrl()

        const response = await fetch(profileImage)
        const blob = await response.blob()

        const result = await fetch(uploadUrl, {
          method: 'POST',
          headers: { 'Content-Type': mimeType || blob.type || 'image/jpeg' },
          body: blob,
        })

        if (!result.ok) {
          throw new Error(`Upload failed with status ${result.status}`)
        }

        const { storageId: newStorageId } = await result.json()
        storageId = newStorageId
      }

      await updateProfile({
        data: {
          ...data,
          storageId,
        },
      })
      // Alert.alert('Success', 'Profile updated successfully')
      router.back()
    } catch (error) {
      console.error(error)
      Alert.alert(
        'Error',
        'Failed to update profile. Your username might be taken.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    })
    if (!result.canceled) {
      setProfileImage(result.assets[0].uri)
      setMimeType(result.assets[0].mimeType)
    }
  }

  // Save button is disabled if saving, OR if the username or first name is taken/invalid
  const watchedFirstName = watch('name') || ''
  const isFormInvalid =
    watchedUsername.length < 3 ||
    watchedFirstName.trim().length === 0 ||
    (debouncedUsername === watchedUsername.toLowerCase().trim() &&
      isUsernameAvailable === false)

  return (
    <ScrollView
      style={{ flex: 1 }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 120 }}
    >
      <View
        style={{
          flexDirection: 'column',
          alignSelf: 'center',
          gap: 10,
          marginVertical: 5,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <View
          style={{
            width: 100,
            height: 100,
            borderRadius: 100,
            overflow: 'hidden',
            backgroundColor: gray[200],
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {profileImage ? (
            <Image
              source={{ uri: profileImage }}
              style={{ width: '100%', height: '100%' }}
            />
          ) : (
            <FontAwesome name="user" size={50} color={gray[500]} />
          )}
        </View>
        <Pressable
          style={{
            padding: 5,
            paddingHorizontal: 8,
            borderRadius: 20,
            backgroundColor: primary[500],
          }}
          onPress={pickImage}
        >
          <Text
            style={{
              fontFamily: 'PlusJakartaSans_400Regular',
              fontSize: 12,
              color: 'white',
            }}
          >
            Change Photo
          </Text>
        </Pressable>
      </View>
      <Controller
        name="username"
        render={({ field: { onChange, onBlur, value } }) => (
          <View>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>username</Text>
              <TextInput
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.textInputStyle}
              />
            </View>

            {/* Real-time Validation UI */}
            {watchedUsername !== user.username &&
              (watchedUsername.length >= 4 || watchedUsername.length > 0) && (
                <Text
                  style={{
                    fontSize: 11,
                    fontFamily: 'PlusJakartaSans_500Medium',
                    marginLeft: 15,
                    marginTop: 2,
                    color:
                      watchedUsername.length < 4
                        ? '#FF4B4B'
                        : debouncedUsername !==
                              watchedUsername.toLowerCase().trim() ||
                            isUsernameAvailable === undefined
                          ? gray[400]
                          : isUsernameAvailable
                            ? '#4ADE80'
                            : '#FF4B4B',
                  }}
                >
                  {watchedUsername.length < 4
                    ? 'Username must be at least 4 characters'
                    : debouncedUsername !==
                          watchedUsername.toLowerCase().trim() ||
                        isUsernameAvailable === undefined
                      ? 'Checking availability...'
                      : isUsernameAvailable
                        ? 'Username is available'
                        : 'This username is already taken'}
                </Text>
              )}
          </View>
        )}
        control={control}
      />
      <Controller
        name="name"
        render={({ field: { onChange, onBlur, value } }) => (
          <View>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>name</Text>
              <TextInput
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                style={styles.textInputStyle}
              />
            </View>
            {watchedFirstName.trim().length === 0 && (
              <Text
                style={{
                  fontSize: 11,
                  fontFamily: 'PlusJakartaSans_500Medium',
                  marginLeft: 15,
                  marginTop: 2,
                  color: '#FF4B4B',
                }}
              >
                Name cannot be blank
              </Text>
            )}
          </View>
        )}
        control={control}
      />

      <Controller
        name="height"
        render={({ field: { onChange, onBlur, value } }) => (
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>height</Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
              <TextInput
                onBlur={onBlur}
                onChangeText={onChange}
                value={value?.toString() ?? '0'}
                style={[styles.textInputStyle, { width: '10%' }]}
                keyboardType="number-pad"
              />
              <Text style={[styles.textInputStyle, { color: gray[400] }]}>
                cm
              </Text>
            </View>
            {/* {field.error && <Text>{field.error.message}</Text>} */}
          </View>
        )}
        control={control}
      />
      <Controller
        name="weight"
        render={({ field: { onChange, onBlur, value } }) => (
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>weight</Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
              <TextInput
                onBlur={onBlur}
                onChangeText={onChange}
                value={value?.toString() ?? '0'}
                style={[styles.textInputStyle, { width: '10%' }]}
                keyboardType="number-pad"
              />
              <Text style={[styles.textInputStyle, { color: gray[400] }]}>
                kg
              </Text>
            </View>
            {/* {field.error && <Text>{field.error.message}</Text>} */}
          </View>
        )}
        control={control}
      />
      <View>
        <Text style={[styles.inputLabel, { paddingLeft: 10 }]}>Gender</Text>
        <View
          style={{
            flexDirection: 'row',
            gap: 5,
            padding: 5,
          }}
        >
          <Pressable
            style={{
              padding: 10,
              borderRadius: 10,
              backgroundColor: gender === 'male' ? 'black' : gray[100],
              flex: 1,
            }}
            onPress={() => {
              setGender('male')
              setValue('gender', 'male')
            }}
          >
            <Text
              style={[
                styles.textInputStyle,
                {
                  textAlign: 'center',
                  color: gender === 'male' ? 'white' : gray[400],
                },
              ]}
            >
              Male
            </Text>
          </Pressable>
          <Pressable
            style={{
              padding: 10,
              borderRadius: 10,
              backgroundColor: gender === 'female' ? 'black' : gray[100],
              flex: 1,
            }}
            onPress={() => {
              setGender('female')
              setValue('gender', 'female')
            }}
          >
            <Text
              style={[
                styles.textInputStyle,
                {
                  textAlign: 'center',
                  color: gender === 'female' ? 'white' : gray[400],
                },
              ]}
            >
              Female
            </Text>
          </Pressable>
        </View>
      </View>
      <View>
        <Text style={[styles.inputLabel, { paddingLeft: 10 }]}>
          Date of Birth
        </Text>
        <Pressable
          style={{
            width: '40%',
            backgroundColor: 'white',
            borderRadius: 10,
            padding: 10,
            borderWidth: 1,
            borderColor: gray[100],
          }}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={[styles.textInputStyle, { textAlign: 'center' }]}>
            {format(new Date(birthDate), 'dd MMM yyyy')}
          </Text>
        </Pressable>
      </View>
      <DatePickerModal
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        selectedDate={new Date(birthDate)}
        onChangeDate={(event, date) => {
          if (date) {
            const timestamp = date.getTime()
            setBirthDate(timestamp)
            setValue('birthDate', timestamp)
            setShowDatePicker(false)
          }
        }}
      />
      <Pressable
        style={{
          backgroundColor: isSaving || isFormInvalid ? gray[300] : 'black',
          borderRadius: 15,
          padding: 15,
          marginTop: 20,
        }}
        onPress={handleSubmit(onSubmit)}
        disabled={isSaving || isFormInvalid}
      >
        {isSaving ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text
            style={[
              styles.textInputStyle,
              { textAlign: 'center', color: 'white' },
            ]}
          >
            Save
          </Text>
        )}
      </Pressable>
    </ScrollView>
  )
}

const ChangeGoal = ({ user }: { user: Doc<'users'> }) => {
  const { bottom } = useSafeAreaInsets()
  const updateProfile = useMutation(api.users.updateProfileData)

  const [currentFocus, setCurrentFocus] = useState(user.focus || '')
  const [currentMotivation, setCurrentMotivation] = useState(
    user.motivation || '',
  )

  const handleUpdate = async (updates: {
    focus?: string
    motivation?: string
  }) => {
    try {
      if (updates.focus) setCurrentFocus(updates.focus)
      if (updates.motivation) setCurrentMotivation(updates.motivation)

      await updateProfile({
        data: updates,
      })
    } catch (error) {
      console.error(error)
      Alert.alert('Error', 'Failed to update goals')
    }
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: bottom + 80 }}
    >
      {/* FOCUS SECTION */}
      <Text style={styles.sectionHeader}>Primary Focus</Text>
      <Text style={styles.sectionSubheader}>What are we tracking today?</Text>
      <View style={{ gap: 8, marginTop: 10 }}>
        {focusOptions.map((option) => (
          <Pressable
            key={option.id}
            onPress={() => handleUpdate({ focus: option.id })}
            style={[
              styles.choiceCard,
              option.id === currentFocus && styles.choiceCardActive,
            ]}
          >
            <Text style={{ fontSize: 24 }}>{option.icon}</Text>
            <Text
              style={[
                styles.choiceText,
                option.id === currentFocus && { color: 'white' },
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* MOTIVATION SECTION */}
      <Text style={[styles.sectionHeader, { marginTop: 30 }]}>End Goal</Text>
      <Text style={styles.sectionSubheader}>Why does this matter to you?</Text>
      <View style={{ gap: 8, marginTop: 10 }}>
        {motivationOptions.map((option) => (
          <Pressable
            key={option.id}
            onPress={() => handleUpdate({ motivation: option.id })}
            style={[
              styles.choiceCard,
              option.id === currentMotivation && styles.choiceCardActive,
            ]}
          >
            <Text style={{ fontSize: 24 }}>{option.icon}</Text>
            <Text
              style={[
                styles.choiceText,
                option.id === currentMotivation && { color: 'white' },
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  )
}

const SettingsSlugPage = () => {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const user = useQuery(api.users.current)

  const slugTitle = slug
    ?.split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

  if (user === undefined) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading...</Text>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: gray[50], padding: 15, paddingTop: 0 }}
      behavior="padding"
      keyboardVerticalOffset={120}
    >
      <Stack.Screen
        options={{
          headerTitle: `${slugTitle}`,
          headerStyle: { backgroundColor: gray[50] },
          headerShadowVisible: true,
        }}
      />
      {slug === 'user_profile' && user && <EditProfile user={user} />}
      {slug === 'change_goal' && user && <ChangeGoal user={user} />}
    </KeyboardAvoidingView>
  )
}

export default SettingsSlugPage

const styles = StyleSheet.create({
  inputContainer: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: gray[100],
    paddingHorizontal: 15,
    paddingTop: 5,
    paddingBottom: 7,
    marginVertical: 5,
    backgroundColor: 'white',
  },
  inputLabel: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 11,
    color: gray[400],
    marginBottom: 5,
  },
  textInputStyle: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 18,
    color: 'black',
  },
  sectionHeader: {
    fontSize: 20,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: 'black',
    marginTop: 10,
  },
  sectionSubheader: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_400Regular',
    color: gray[500],
  },
  choiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: gray[200],
  },
  choiceCardActive: {
    backgroundColor: 'black',
    borderColor: 'black',
  },
  choiceText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 16,
    color: 'black',
  },
})
