import { useEffect, useState } from 'react'
import {
  Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, Sun,
} from 'lucide-react'

// Addis Ababa coordinates. Change these if your operations are based elsewhere.
const LAT = 9.03
const LON = 38.74
const LOCATION_NAME = 'Addis Ababa'

// WMO weather codes -> Lucide component. Kept as components (not elements) so
// each entry stays a plain reference and the size is decided at the render site.
const WEATHER_ICONS = {
  0: Sun, 1: CloudSun, 2: CloudSun, 3: Cloud,
  45: CloudFog, 48: CloudFog,
  51: CloudDrizzle, 53: CloudDrizzle, 55: CloudRain,
  61: CloudRain, 63: CloudRain, 65: CloudRain,
  71: CloudSnow, 73: CloudSnow, 75: CloudSnow,
  80: CloudDrizzle, 81: CloudRain, 82: CloudLightning,
  95: CloudLightning, 96: CloudLightning, 99: CloudLightning,
}

export default function WeatherWidget() {
  const [weather, setWeather] = useState(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,weather_code&daily=precipitation_probability_max&timezone=auto&forecast_days=2`
    fetch(url)
      .then((res) => res.json())
      .then((data) => setWeather(data))
      .catch(() => setError(true))
  }, [])

  if (error) return null
  if (!weather) return <div className="weather-widget">Loading weather…</div>

  const currentTemp = Math.round(weather.current?.temperature_2m)
  const currentCode = weather.current?.weather_code
  const tomorrowRainChance = weather.daily?.precipitation_probability_max?.[1]

  return (
    <div className="weather-widget">
      <div className="weather-icon">
        {(() => {
          const Icon = WEATHER_ICONS[currentCode] || CloudSun
          return <Icon size={28} />
        })()}
      </div>
      <div>
        <div className="weather-location">{LOCATION_NAME}</div>
        <div className="weather-temp">{currentTemp}°C</div>
        {tomorrowRainChance != null && (
          <div className="weather-forecast">
            {tomorrowRainChance >= 40 ? `Rain likely tomorrow (${tomorrowRainChance}%)` : 'Clear tomorrow'}
          </div>
        )}
      </div>
    </div>
  )
}
