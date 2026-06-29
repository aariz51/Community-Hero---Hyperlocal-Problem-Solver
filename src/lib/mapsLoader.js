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
      libraries: ['marker'],
    })
    loaderPromise = loader.load()
  }
  return loaderPromise
}

// Reverse-geocode via our own server (/api/geocode). Done server-side so it
// doesn't depend on the browser Maps key being allowed to use the JS Geocoder.
export async function reverseGeocode({ lat, lng }) {
  const fallback = `${lat.toFixed(4)}, ${lng.toFixed(4)}`
  try {
    const r = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`)
    if (!r.ok) return fallback
    const { address } = await r.json()
    return address || fallback
  } catch {
    return fallback
  }
}
