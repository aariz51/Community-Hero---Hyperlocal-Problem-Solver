// Seed realistic demo data (no Gemini needed) so the map/dashboard look alive.
import { collection, addDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { CATEGORY_META, routeToDepartment } from '../agent/departments'

function placeholder(category) {
  const c = document.createElement('canvas'); c.width = 320; c.height = 200
  const ctx = c.getContext('2d')
  ctx.fillStyle = CATEGORY_META[category]?.color || '#888'
  ctx.fillRect(0, 0, 320, 200)
  ctx.fillStyle = 'rgba(255,255,255,.18)'
  for (let i = 0; i < 6; i++) ctx.fillRect(Math.random() * 320, Math.random() * 200, 60, 60)
  ctx.font = '90px serif'; ctx.textAlign = 'center'
  ctx.fillText(CATEGORY_META[category]?.icon || '📌', 160, 130)
  return c.toDataURL('image/jpeg', 0.7)
}

const SAMPLES = [
  ['Pothole', 'High', 'Large water-filled pothole spanning half the lane near the junction.', 'MG Road, Sector 14', 28.6139, 77.2090, 'in_progress', 78],
  ['Pothole', 'Critical', 'Deep pothole causing two-wheeler accidents at the turn.', 'Ring Road, Lajpat Nagar', 28.5677, 77.2433, 'reported', 88],
  ['Water Leakage', 'High', 'Continuous pipeline leak flooding the footpath for 3 days.', 'Nehru Place', 28.5494, 77.2510, 'acknowledged', 65],
  ['Streetlight', 'Medium', 'Three streetlights dead on the stretch, very dark at night.', 'Sector 12, Dwarka', 28.5921, 77.0460, 'reported', 40],
  ['Garbage/Waste', 'High', 'Overflowing garbage bins attracting stray animals near market.', 'Sarojini Market', 28.5775, 77.1995, 'verified', 55],
  ['Drainage', 'Critical', 'Blocked storm drain causing waterlogging during rain.', 'Minto Road', 28.6330, 77.2270, 'in_progress', 82],
  ['Road Damage', 'Medium', 'Cracked and uneven road surface over a 30m stretch.', 'Vasant Kunj', 28.5200, 77.1590, 'resolved', 35],
  ['Fallen Tree', 'High', 'Tree branch fallen blocking half the road after storm.', 'Civil Lines', 28.6800, 77.2230, 'acknowledged', 60],
  ['Streetlight', 'Low', 'Flickering streetlight near the bus stop.', 'Rohini Sector 7', 28.7040, 77.1100, 'verified', 20],
  ['Pothole', 'Medium', 'Cluster of small potholes after recent digging work.', 'Saket', 28.5245, 77.2066, 'reported', 50],
  ['Water Leakage', 'Medium', 'Tap valve broken, drinking water being wasted.', 'Karol Bagh', 28.6510, 77.1900, 'resolved', 30],
  ['Garbage/Waste', 'Critical', 'Illegal dumping of construction debris on roadside.', 'Okhla Phase 1', 28.5350, 77.2730, 'reported', 75],
]

const DAY = 86400000

export async function seedDemoData(user) {
  const col = collection(db, 'reports')
  const now = Date.now()
  for (let i = 0; i < SAMPLES.length; i++) {
    const [category, severity, description, address, lat, lng, status, risk] = SAMPLES[i]
    const created = now - (Math.floor(Math.random() * 12) + 1) * DAY
    const routing = routeToDepartment(category)
    const history = [{ status: 'reported', at: created }]
    const order = ['reported', 'acknowledged', 'in_progress', 'resolved', 'verified']
    const idx = order.indexOf(status)
    for (let s = 1; s <= idx; s++) history.push({ status: order[s], at: created + s * (Math.random() * 2 + 0.5) * DAY })
    await addDoc(col, {
      userId: i % 3 === 0 ? user.uid : `seed_${i}`,
      userName: i % 3 === 0 ? (user.displayName || 'You') : 'Resident',
      photoUrl: placeholder(category),
      category, severity, description,
      confidence: 0.8 + Math.random() * 0.18,
      address, geo: { lat, lng },
      department: routing.department, sla: routing.slaDays,
      status, statusHistory: history,
      votes: Math.floor(Math.random() * 20) + 1, voterIds: [],
      duplicateOf: null,
      escalationRisk: risk, escalationReason: 'Likely to worsen with traffic/monsoon exposure.',
      complaintLetter: '',
      createdAt: new Date(created),
    })
  }
}
