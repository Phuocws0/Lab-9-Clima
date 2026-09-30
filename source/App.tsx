import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  Keyboard,
  PermissionsAndroid,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Geolocation from '@react-native-community/geolocation';
import {WEATHER_API_KEY} from '@env';

type Weather = {
  city: string;
  temperature: number;
  condition: string;
  conditionId: number;
};

const API_URL = 'https://api.openweathermap.org/data/2.5/weather';

export default function App() {
  const [weather, setWeather] = useState<Weather | null>(null);
  const [cityInput, setCityInput] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchWeather = async (query: string) => {
    const apiKey = WEATHER_API_KEY?.trim();
    if (!apiKey) {
      setWeather(null);
      setError('Add WEATHER_API_KEY to source/.env to load live weather.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}?${query}&appid=${encodeURIComponent(apiKey)}&units=metric`);
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('OpenWeather rejected this API key. Update WEATHER_API_KEY in source/.env.');
        }
        if (response.status === 404) {
          throw new Error('City not found. Check the spelling and try again.');
        }
        throw new Error(`Weather request failed (${response.status}). Try again in a moment.`);
      }

      const temperature = Number(data?.main?.temp);
      const conditionId = Number(data?.weather?.[0]?.id);
      if (!Number.isFinite(temperature) || !Number.isFinite(conditionId) || !data?.name) {
        throw new Error('Weather data was incomplete. Please try again.');
      }

      setWeather({
        city: String(data.name),
        temperature: Math.round(temperature),
        condition: String(data.weather[0].description ?? 'Current conditions'),
        conditionId,
      });
    } catch (requestError) {
      setWeather(null);
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Could not reach the weather service. Check your connection and try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  const loadByLocation = async () => {
    setLoading(true);
    setError('');
    try {
      if (Platform.OS === 'android') {
        const permission = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        ]);
        const hasLocationPermission =
          permission[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] ===
            PermissionsAndroid.RESULTS.GRANTED ||
          permission[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION] ===
            PermissionsAndroid.RESULTS.GRANTED;
        if (!hasLocationPermission) {
          throw new Error('Location permission was not granted. Search for a city instead.');
        }
      }

      const position = await new Promise<{latitude: number; longitude: number}>(
        (resolve, reject) => {
          Geolocation.getCurrentPosition(
            result =>
              resolve({
                latitude: result.coords.latitude,
                longitude: result.coords.longitude,
              }),
            locationError => reject(new Error(locationError.message)),
            {enableHighAccuracy: false, timeout: 15000, maximumAge: 60000},
          );
        },
      );
      await fetchWeather(`lat=${position.latitude}&lon=${position.longitude}`);
    } catch (locationError) {
      setWeather(null);
      setLoading(false);
      setError(
        locationError instanceof Error
          ? locationError.message
          : 'Could not read this device location. Search for a city instead.',
      );
    }
  };

  const searchCity = () => {
    const city = cityInput.trim();
    if (!city) {
      setError('Enter a city name to search.');
      return;
    }
    setSearchOpen(false);
    Keyboard.dismiss();
    void fetchWeather(`q=${encodeURIComponent(city)}`);
  };

  useEffect(() => {
    void loadByLocation();
  }, []);

  return (
    <ImageBackground
      source={require('./assets/location_background.jpg')}
      resizeMode="cover"
      style={styles.background}>
      <StatusBar barStyle="light-content" backgroundColor="#101923" />
      <View style={styles.scrim} />
      <SafeAreaView style={styles.page}>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.eyebrow}>LIVE CONDITIONS</Text>
            <Text style={styles.title}>Clima</Text>
          </View>
          <Text style={styles.mark}>°</Text>
        </View>

        <View style={styles.actions}>
          <Action title="⌖  My location" onPress={() => void loadByLocation()} />
          <Action
            title={searchOpen ? '×  Close search' : '⌕  City search'}
            onPress={() => {
              setSearchOpen(value => !value);
              setError('');
            }}
          />
        </View>

        {searchOpen && (
          <View style={styles.searchBox}>
            <TextInput
              accessibilityLabel="City name"
              autoCapitalize="words"
              autoCorrect={false}
              onChangeText={setCityInput}
              onSubmitEditing={searchCity}
              placeholder="Enter a city name"
              placeholderTextColor="#a8b4c0"
              returnKeyType="search"
              style={styles.input}
              value={cityInput}
            />
            <Pressable accessibilityRole="button" onPress={searchCity} style={styles.searchButton}>
              <Text style={styles.searchButtonText}>SEARCH</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.weatherArea}>
          {loading ? (
            <View style={styles.messageCard}>
              <ActivityIndicator color="#c9f2ed" size="large" />
              <Text style={styles.messageTitle}>Finding your weather</Text>
              <Text style={styles.messageBody}>Checking current conditions…</Text>
            </View>
          ) : weather ? (
            <View style={styles.weatherCard}>
              <View style={styles.livePill}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>CURRENT WEATHER</Text>
              </View>
              <View style={styles.temperatureRow}>
                <Text style={styles.temperature}>{weather.temperature}°</Text>
                <Text style={styles.weatherIcon}>{getWeatherIcon(weather.conditionId)}</Text>
              </View>
              <Text style={styles.condition}>{capitalize(weather.condition)}</Text>
              <Text style={styles.city}>{weather.city}</Text>
              <View style={styles.rule} />
              <Text style={styles.tip}>{getWeatherMessage(weather.temperature)}</Text>
              <Text style={styles.units}>CELSIUS  ·  LIVE FROM OPENWEATHER</Text>
            </View>
          ) : (
            <View style={styles.messageCard}>
              <Text style={styles.errorIcon}>☁</Text>
              <Text style={styles.messageTitle}>Weather unavailable</Text>
              <Text style={styles.messageBody}>{error || 'Try searching for a city.'}</Text>
              {error.includes('API key') || error.includes('WEATHER_API_KEY') ? null : (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void loadByLocation()}
                  style={styles.retryButton}>
                  <Text style={styles.retryText}>TRY AGAIN</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>

        <Text style={styles.footer}>Weather for wherever you are</Text>
      </SafeAreaView>
    </ImageBackground>
  );
}

function Action({title, onPress}: {title: string; onPress: () => void}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({pressed}) => [styles.action, pressed && styles.pressed]}>
      <Text style={styles.actionText}>{title}</Text>
    </Pressable>
  );
}

function getWeatherIcon(condition: number) {
  if (condition < 300) return '🌩️';
  if (condition < 400) return '🌧️';
  if (condition < 600) return '🌧️';
  if (condition < 700) return '❄️';
  if (condition < 800) return '🌫️';
  if (condition === 800) return '☀️';
  if (condition <= 804) return '☁️';
  return '🌤️';
}

function getWeatherMessage(temperature: number) {
  if (temperature > 25) return 'It’s ice cream weather.';
  if (temperature > 20) return 'Time for shorts and a tee.';
  if (temperature < 10) return 'You’ll need a scarf and gloves.';
  return 'Bring a jacket, just in case.';
}

function capitalize(value: string) {
  return value.length ? value[0].toUpperCase() + value.slice(1) : value;
}

const styles = StyleSheet.create({
  background: {flex: 1, backgroundColor: '#17212a'},
  scrim: {...StyleSheet.absoluteFill, backgroundColor: 'rgba(7, 16, 24, 0.58)'},
  page: {flex: 1, paddingHorizontal: 22, paddingTop: 16, paddingBottom: 16},
  topBar: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  eyebrow: {color: '#c1d3dc', fontSize: 11, fontWeight: '800', letterSpacing: 2.3},
  title: {color: '#ffffff', fontSize: 34, fontWeight: '800', letterSpacing: 0.4, marginTop: 3},
  mark: {color: '#d4f5ef', fontSize: 62, fontWeight: '300', lineHeight: 66},
  actions: {flexDirection: 'row', gap: 10, marginTop: 18},
  action: {
    flex: 1,
    minHeight: 48,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderColor: 'rgba(255,255,255,0.25)',
    borderWidth: 1,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: {color: '#ffffff', fontSize: 13, fontWeight: '700'},
  pressed: {opacity: 0.72},
  searchBox: {
    flexDirection: 'row',
    gap: 8,
    padding: 9,
    marginTop: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(15,25,32,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  input: {
    flex: 1,
    minHeight: 44,
    color: '#ffffff',
    fontSize: 15,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 11,
  },
  searchButton: {paddingHorizontal: 12, minWidth: 82, justifyContent: 'center', alignItems: 'center'},
  searchButtonText: {color: '#c9f2ed', fontSize: 11, fontWeight: '900', letterSpacing: 1},
  weatherArea: {flex: 1, justifyContent: 'center', paddingVertical: 20},
  weatherCard: {
    backgroundColor: 'rgba(18, 31, 39, 0.73)',
    borderWidth: 1,
    borderColor: 'rgba(218, 245, 242, 0.25)',
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
    alignItems: 'center',
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: 'rgba(201,242,237,0.12)',
  },
  liveDot: {width: 7, height: 7, borderRadius: 4, backgroundColor: '#91e4d5', marginRight: 8},
  liveText: {color: '#d3f5ef', fontSize: 10, letterSpacing: 1.7, fontWeight: '800'},
  temperatureRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16},
  temperature: {color: '#ffffff', fontSize: 100, fontWeight: '300', letterSpacing: -5, lineHeight: 116},
  weatherIcon: {fontSize: 52, marginLeft: 8},
  condition: {color: '#d8e7eb', fontSize: 18, fontWeight: '600', textTransform: 'capitalize'},
  city: {color: '#ffffff', fontSize: 30, fontWeight: '800', marginTop: 8},
  rule: {width: '100%', height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 20},
  tip: {color: '#d4f5ef', fontSize: 15, fontWeight: '600', textAlign: 'center'},
  units: {color: '#b5c7ce', fontSize: 9, letterSpacing: 1.4, fontWeight: '800', marginTop: 18},
  messageCard: {
    backgroundColor: 'rgba(18, 31, 39, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(218, 245, 242, 0.22)',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  errorIcon: {color: '#d4f5ef', fontSize: 48},
  messageTitle: {color: '#ffffff', fontSize: 21, fontWeight: '800', textAlign: 'center', marginTop: 10},
  messageBody: {color: '#d2dce0', fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 9},
  retryButton: {
    marginTop: 18,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'rgba(201,242,237,0.6)',
  },
  retryText: {color: '#d4f5ef', fontSize: 11, fontWeight: '900', letterSpacing: 1.2},
  footer: {color: '#c1ced2', fontSize: 11, textAlign: 'center', letterSpacing: 0.6},
});
