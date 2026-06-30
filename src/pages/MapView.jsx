import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useReports } from '../hooks/useReports'
import { loadMaps } from '../lib/mapsLoader'
import { CATEGORIES, CATEGORY_META, STATUS_LABEL, STATUS_FLOW } from '../agent/departments'

const DARK_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#0d0d0d' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0d0d0d' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8a8a8a' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1f1f1f' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#6b6b6b' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2a2a2a' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#070707' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#2a2a2a' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#0d0d0d' }] },
]

// meters represented by one screen pixel at a given latitude + zoom
function metersPerPixel(lat, zoom) {
  return (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom)
}

export default function MapView() {
  const { reports } = useReports()
  const nav = useNavigate()
  const mapRef = useRef(null)
  const mapObj = useRef(null)
  const markers = useRef([])
  const heat = useRef(null)
  const [ready, setReady] = useState(false)
  const [showHeat, setShowHeat] = useState(false)
  const [cat, setCat] = useState('all')
  const [status, setStatus] = useState('all')
  const [mapTick, setMapTick] = useState(0)
  const [err, setErr] = useState('')

  useEffect(() => {
    let cancelled = false
    loadMaps().then((google) => {
      if (cancelled) return
      mapObj.current = new google.maps.Map(mapRef.current, {
        center: { lat: 28.6139, lng: 77.209 }, zoom: 11, mapTypeControl: false, streetViewControl: false,
        fullscreenControl: false, styles: DARK_STYLE, backgroundColor: '#0d0d0d',
      })
      // re-render the heatmap whenever the view settles (zoom/pan) so blooms stay pixel-stable
      mapObj.current.addListener('idle', () => setMapTick((t) => t + 1))
      setReady(true)
    }).catch((e) => setErr('Map failed to load. Check the Maps API key/billing. ' + e.message))
    return () => { cancelled = true }
  }, [])

  const filtered = reports.filter((r) =>
    (cat === 'all' || r.category === cat) && (status === 'all' || r.status === status) && r.geo)

  // markers (do NOT rebuild on pan/zoom)
  useEffect(() => {
    if (!ready || !mapObj.current) return
    loadMaps().then((google) => {
      markers.current.forEach((m) => m.setMap(null))
      markers.current = []
      const bounds = new google.maps.LatLngBounds()
      filtered.forEach((r) => {
        const marker = new google.maps.Marker({
          position: r.geo, map: mapObj.current,
          title: `${r.category} · ${r.severity}`,
          icon: {
            path: google.maps.SymbolPath.CIRCLE, scale: 9,
            fillColor: CATEGORY_META[r.category]?.color || '#888', fillOpacity: 0.95,
            strokeColor: '#fff', strokeWeight: 2,
          },
        })
        marker.addListener('click', () => nav(`/issue/${r.id}`))
        markers.current.push(marker)
        bounds.extend(r.geo)
      })
      if (filtered.length) {
        mapObj.current.fitBounds(bounds, 60)
        google.maps.event.addListenerOnce(mapObj.current, 'idle', () => {
          if (mapObj.current.getZoom() > 14) mapObj.current.setZoom(14)
        })
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, reports, cat, status])

  // heatmap — pixel-stable warm bloom, rebuilt on zoom/pan (mapTick)
  useEffect(() => {
    if (!ready || !mapObj.current) return
    loadMaps().then((google) => {
      if (heat.current) { heat.current.forEach((c) => c.setMap(null)); heat.current = null }
      if (!showHeat) return
      const zoom = mapObj.current.getZoom() || 11
      const center = mapObj.current.getCenter()
      const lat = center ? center.lat() : 28.6
      const mpp = metersPerPixel(lat, zoom)
      const rings = [
        { p: 95, o: 0.05, c: '#ff3b00' },
        { p: 76, o: 0.06, c: '#ff5a00' },
        { p: 60, o: 0.07, c: '#ff7a00' },
        { p: 46, o: 0.09, c: '#ff9e00' },
        { p: 33, o: 0.12, c: '#ffc400' },
        { p: 21, o: 0.15, c: '#ffe000' },
        { p: 11, o: 0.20, c: '#fff59d' },
      ]
      const circles = []
      filtered.forEach((rep) => {
        if (!rep.geo || typeof rep.geo.lat !== 'number') return
        rings.forEach(({ p, o, c }) => {
          circles.push(new google.maps.Circle({
            center: { lat: rep.geo.lat, lng: rep.geo.lng }, radius: p * mpp, map: mapObj.current,
            fillColor: c, fillOpacity: o, strokeWeight: 0, clickable: false, zIndex: 1,
          }))
        })
      })
      heat.current = circles
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, reports, cat, status, showHeat, mapTick])

  return (
    <div className="page wide">
      <div className="map-toolbar">
        <h2>Live issue map</h2>
        <div className="filters">
          <select value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="all">All categories</option>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All statuses</option>
            {STATUS_FLOW.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
          <button className={showHeat ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'} onClick={() => setShowHeat((v) => !v)}>
            🔥 Heatmap {showHeat ? 'on' : 'off'}
          </button>
          <span className="muted">{filtered.length} shown</span>
        </div>
      </div>
      {err && <div className="alert error">{err}</div>}
      <div ref={mapRef} className="map-canvas" />
      <div className="sr-only" aria-label="Map report index">
        {filtered.map((r) => (
          <a key={r.id} href={`/issue/${r.id}`}>{r.id} {r.category} {r.address}</a>
        ))}
      </div>
      <div className="legend">
        {CATEGORIES.map((c) => (
          <span key={c} className="leg"><i style={{ background: CATEGORY_META[c]?.color }} />{CATEGORY_META[c]?.icon} {c}</span>
        ))}
      </div>
    </div>
  )
}
