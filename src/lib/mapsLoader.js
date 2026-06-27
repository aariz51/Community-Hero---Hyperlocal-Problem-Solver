// Loads Google Maps JS API once (with visualization lib for heatmap) and exposes
// helpers. Key is restricted to Maps JavaScript API, so geocoding uses the JS Geocoder.
import { Loader } from '@googlemaps/js-api-loader'
import { MAPS_KEY } from '../firebase'

let loaderPromise = null
export function loadMaps() {
  if (!loaderPromise) {
    const loader = new Loader({
      apiKey: MAPS_KEY,
      version: 'weekly',
      libraries: ['visualization', 'marker'],
    })
    loaderPromise = loader.load()
  }
  return loaderPromise
}

export async function reverseGeocode({ lat, lng }) {
  try {
    const google = await loadMaps()
    const geocoder = new google.maps.Geocoder()
    const { results } = await geocoder.geocode({ location: { lat, lng } })
    return results?.[0]?.formatted_address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`
  } catch {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`
  }
}
