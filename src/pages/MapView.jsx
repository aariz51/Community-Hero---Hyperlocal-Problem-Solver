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
  const [err, setErr] = useState('')

  useEffect(() => {
    let cancelled = false
    loadMaps().then((google) => {
      if (cancelled) return
      mapObj.current = new google.maps.Map(mapRef.current, {
        center: { lat: 28.6139, lng: 77.209 }, zoom: 11, mapTypeControl: false, streetViewControl: false,
        fullscreenControl: false, styles: DARK_STYLE, backgroundColor: '#0d0d0d',
      })
      setReady(true)
    }).catch((e) => setErr('Map failed to load. Check the Maps API key/billing. ' + e.message))
    return () => { cancelled = true }
  }, [])

  const filtered = reports.filter((r) =>
    (cat === 'all' || r.category === cat) && (status === 'all' || r.status === status) && r.geo)

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
      if (filtered.length) mapObj.current.fitBounds(bounds)

      // heatmap — emulated with translucent red circles (Maps HeatmapLayer was
      // removed in Maps JS v3.65). Overlapping circles make clusters glow hotter.
      if (heat.current) { heat.current.forEach((c) => c.setMap(null)); heat.current = null }
      if (showHeat) {
        const layers = [{ r: 3500, o: 0.12 }, { r: 2000, o: 0.16 }, { r: 1000, o: 0.26 }]
        const circles = []
        filtered.forEach((rep) => {
          if (!rep.geo || typeof rep.geo.lat !== 'number') return
          layers.forEach(({ r, o }) => {
            circles.push(new google.maps.Circle({
              center: { lat: rep.geo.lat, lng: rep.geo.lng }, radius: r, map: mapObj.current,
              fillColor: '#ff2d00', fillOpacity: o, strokeWeight: 0, clickable: false, zIndex: 1,
            }))
          })
        })
        heat.current = circles
      }
    })
  }, [ready, reports, cat, status, showHeat])

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
      <div className="legend">
        {CATEGORIES.map((c) => (
          <span key={c} className="leg"><i style={{ background: CATEGORY_META[c]?.color }} />{CATEGORY_META[c]?.icon} {c}</span>
        ))}
      </div>
    </div>
  )
}
