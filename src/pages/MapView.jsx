import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useReports } from '../hooks/useReports'
import { loadMaps } from '../lib/mapsLoader'
import { CATEGORIES, CATEGORY_META, STATUS_LABEL, STATUS_FLOW } from '../agent/departments'

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
        styles: [{ featureType: 'poi', stylers: [{ visibility: 'off' }] }],
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

      // heatmap
      if (heat.current) { heat.current.setMap(null); heat.current = null }
      if (showHeat && google.maps.visualization) {
        heat.current = new google.maps.visualization.HeatmapLayer({
          data: filtered.map((r) => new google.maps.LatLng(r.geo.lat, r.geo.lng)),
          map: mapObj.current, radius: 40,
        })
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
