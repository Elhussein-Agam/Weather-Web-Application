const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

// OpenWeatherMap API key (replace with your API key)
const API_KEY = 'e1e131c29d7c2187160a8bbe3af4ae42';

// Middleware to parse JSON and URL-encoded request bodies
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.use(express.static('public')); // Serve static files for CSS

// Route: Home Page (Form)
app.get('/', (req, res) => {
  res.render('index'); // Render the form for user input
});

// Route: Check Rain
app.post('/check-rain', async (req, res) => {
  const { location } = req.body;

  try {
    // Get geocoding data for the location
    const geoResponse = await axios.get(
      `http://api.openweathermap.org/geo/1.0/direct`,
      {
        params: {
          q: location,
          appid: API_KEY,
        },
      }
    );

    if (geoResponse.data.length === 0) {
      return res.render('result', {
        message: `Location "${location}" not found.`,
        error: true,
      });
    }

    const { lat, lon } = geoResponse.data[0];

    // Get weather data using Forecast API
    const weatherResponse = await axios.get(
      `https://api.openweathermap.org/data/2.5/forecast`,
      {
        params: {
          lat,
          lon,
          units: 'metric', // Convert temperatures to Celsius
          appid: API_KEY,
        },
      }
    );

    
    const forecasts = weatherResponse.data.list;

    // Get tomorrow's date in YYYY-MM-DD format
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const tomorrowDate = tomorrow.toISOString().split('T')[0];

    // Check if it will rain tomorrow
    let willRain = false;
    let tempMax = -Infinity;
    let tempMin = Infinity;
    let rainChance = 0;

    forecasts.forEach((forecast) => {
      const forecastDate = forecast.dt_txt.split(' ')[0];

      if (forecastDate === tomorrowDate) {
        if (forecast.rain && forecast.rain['3h']) {
          willRain = true;
          rainChance += forecast.rain['3h']; // Accumulate rain volume
        }
        tempMax = Math.max(tempMax, forecast.main.temp_max);
        tempMin = Math.min(tempMin, forecast.main.temp_min);
      }
    });

    // Prepare the message
    const message = willRain
      ? `Yes, it will rain tomorrow in ${location}.`
      : `No, it will not rain tomorrow in ${location}.`;

    res.render('result', {
      message,
      tempMax: tempMax.toFixed(1),
      tempMin: tempMin.toFixed(1),
      rainChance: rainChance.toFixed(1), // Total rain volume in mm
      error: false,
    });
  } catch (error) {
    console.error('Error fetching weather data:', error.response.data);
    res.render('result', {
      message: 'Unable to fetch weather data. Please try again.',
      error: true,
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});