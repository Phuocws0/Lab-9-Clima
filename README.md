# Lab 9: Clima - Powering Your Flutter App with Live Web Data

React Native and TypeScript conversion of the Flutter weather lab. Clima looks up current conditions by city or device location, shows metric temperature and a condition summary, and reports loading, location, network, and API-key errors without using sample weather data.

## Configure weather access

OpenWeather access is required for live results. Copy the example file and set your key locally:

```sh
cd source
cp .env.example .env
# Set WEATHER_API_KEY in .env
```

Keep `.env` private; it is ignored by Git.

## Run on Android

Requires Node.js 22.11 or newer and Android Studio/SDK setup.

```sh
cd source
npm install
npm run android
```

The demo video is stored separately on the developer's machine. The key in the original Flutter source returned HTTP 401 during conversion, so a valid local key is needed for successful weather data.
