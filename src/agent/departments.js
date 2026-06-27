// Category taxonomy + department routing + SLA. Pure logic (no AI) — used by the
// agent's routeToDepartment tool and across the UI.

export const CATEGORIES = [
  'Pothole',
  'Water Leakage',
  'Streetlight',
  'Garbage/Waste',
  'Road Damage',
  'Drainage',
  'Fallen Tree',
  'Other',
]

export const CATEGORY_META = {
  Pothole:        { icon: '🕳️', color: '#e6694a' },
  'Water Leakage':{ icon: '💧', color: '#2e9fd6' },
  Streetlight:    { icon: '💡', color: '#f0b429' },
  'Garbage/Waste':{ icon: '🗑️', color: '#5b8c3e' },
  'Road Damage':  { icon: '🚧', color: '#d6852e' },
  Drainage:       { icon: '🌊', color: '#3a7ca5' },
  'Fallen Tree':  { icon: '🌳', color: '#2f8f4e' },
  Other:          { icon: '📌', color: '#7a7a7a' },
}

// Department + SLA (days) per category.
const ROUTING = {
  Pothole:         { department: 'Public Works Dept (PWD)',        slaDays: 5 },
  'Road Damage':   { department: 'Public Works Dept (PWD)',        slaDays: 5 },
  'Water Leakage': { department: 'Water Supply & Sewerage Board',  slaDays: 2 },
  Drainage:        { department: 'Water Supply & Sewerage Board',  slaDays: 3 },
  Streetlight:     { department: 'Electrical / Street Lighting',   slaDays: 4 },
  'Garbage/Waste': { department: 'Sanitation & Waste Management',  slaDays: 1 },
  'Fallen Tree':   { department: 'Parks & Horticulture',          slaDays: 2 },
  Other:           { department: 'Municipal Grievance Cell',       slaDays: 7 },
}

export function routeToDepartment(category) {
  return ROUTING[category] || ROUTING.Other
}

export const SEVERITY_RANK = { Critical: 4, High: 3, Medium: 2, Low: 1 }
export const SEVERITY_COLOR = {
  Critical: '#c0392b', High: '#e67e22', Medium: '#f1c40f', Low: '#27ae60',
}

export const STATUS_FLOW = ['reported', 'acknowledged', 'in_progress', 'resolved', 'verified']
export const STATUS_LABEL = {
  reported: 'Reported', acknowledged: 'Acknowledged', in_progress: 'In Progress',
  resolved: 'Resolved', verified: 'Verified Fixed',
}
