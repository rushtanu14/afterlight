export type Failure = {
  id: string;
  title: string;
  text: string;
  card: string;
};

export type EvidenceItem = {
  label: string;
  source: string;
  detail: string;
  url: string;
};

export type ReplayEvent = {
  time: string;
  source: string;
  title: string;
  body: string;
  caption: string;
  risk: "watch" | "warning" | "critical" | "recovery";
  cache: number;
  signal: string;
  spread: number;
  routeStress: number;
  officialConfidence: number;
  recommendedAction: string;
  evidence: EvidenceItem[];
  failures: Failure[];
};

export type IncidentSource = {
  label: string;
  detail: string;
  url: string;
};

export type IncidentOption = {
  id: string;
  name: string;
  location: string;
  distance: string;
  started: string;
  updated: string;
  confidence: string;
  summary: string;
  sources: IncidentSource[];
  sourceId?: string;
  latitude?: number;
  longitude?: number;
  acres?: number;
  containment?: number | null;
  lastUpdated?: string;
  feedUrl?: string;
};

export const incidentOptions: IncidentOption[] = [
  {
    id: "palisades-2025",
    name: "Palisades Fire",
    location: "Pacific Palisades, Los Angeles County",
    distance: "2.8 mi from searched area",
    started: "January 7, 2025",
    updated: "official timeline rows available",
    confidence: "High source match",
    summary: "Coastal hillside fire with evacuation pressure, smoke movement, route stress, and source-chain reconstruction.",
    sources: [
      {
        label: "FSRI timeline",
        detail: "Timestamped Southern California fires timeline report.",
        url: "https://fsri.org/research-update/southern-california-fires-timeline-report"
      },
      {
        label: "CAL FIRE incidents",
        detail: "Incident context, evacuation legend, and official caveats.",
        url: "https://www.fire.ca.gov/incidents"
      },
      {
        label: "NASA FIRMS",
        detail: "Satellite fire-detection map reference.",
        url: "https://firms.modaps.eosdis.nasa.gov/map/"
      }
    ]
  },
  {
    id: "eaton-2025",
    name: "Eaton Fire",
    location: "Altadena and Pasadena foothills",
    distance: "18.4 mi from searched area",
    started: "January 7, 2025",
    updated: "official review rows available",
    confidence: "High source match",
    summary: "Foothill incident with warning escalation, assistance needs, and route-capacity failure patterns.",
    sources: [
      {
        label: "LA County timeline",
        detail: "Public timeline overview for Eaton Fire review.",
        url: "https://file.lacounty.gov/SDSInter/lac/1191567_EatonFireTimelineOverview.pdf"
      },
      {
        label: "CAL FIRE incidents",
        detail: "Incident and evacuation-status vocabulary.",
        url: "https://www.fire.ca.gov/incidents"
      },
      {
        label: "ArcGIS dashboard pattern",
        detail: "Map, indicator, and chart dashboard structure.",
        url: "https://learn.arcgis.com/en/projects/make-a-dashboard-to-monitor-wildfires/"
      }
    ]
  },
  {
    id: "franklin-2024",
    name: "Franklin Fire",
    location: "Malibu, Los Angeles County",
    distance: "11.1 mi from searched area",
    started: "December 9, 2024",
    updated: "incident records available",
    confidence: "Medium source match",
    summary: "Coastal terrain fire with wind exposure and road-dependency lessons relevant to Pacific Palisades.",
    sources: [
      {
        label: "CAL FIRE incidents",
        detail: "Incident-history lookup and map layer vocabulary.",
        url: "https://www.fire.ca.gov/incidents"
      },
      {
        label: "NASA FIRMS",
        detail: "Satellite thermal-detection context.",
        url: "https://firms.modaps.eosdis.nasa.gov/map/"
      }
    ]
  }
];

export const replayEvents: ReplayEvent[] = [
  {
    time: "17:18",
    source: "NWS / local alert relay",
    title: "Red flag warning overlaps evening commute",
    body: "Wind forecast, dry fuel, and school pickup traffic combine into a high-friction evacuation window.",
    caption: "Before flames reach the road network, Afterlight marks the commute window as a reusable decision signal.",
    risk: "watch",
    cache: 72,
    signal: "Wind + commute pressure",
    spread: 22,
    routeStress: 34,
    officialConfidence: 81,
    recommendedAction: "Pre-load household plan, medication bag, and backup pickup rule.",
    evidence: [
      {
        label: "Weather signal",
        source: "NWS / alert relay",
        detail: "Red flag conditions overlap the evening pickup window.",
        url: "https://www.weather.gov/fire/"
      },
      {
        label: "Route dependency",
        source: "Household memory",
        detail: "Primary ridge road depends on school and commute timing.",
        url: "https://learn.arcgis.com/en/projects/make-a-dashboard-to-monitor-wildfires/"
      }
    ],
    failures: [
      {
        id: "commute-window",
        title: "Pickup traffic becomes an evacuation bottleneck",
        text: "Families need a before-school and after-school reunification rule for red flag days.",
        card: "Red flag day rule: confirm pickup backup, shared contact, and walking meet point before 2 PM."
      }
    ]
  },
  {
    time: "18:07",
    source: "CAL FIRE incident feed",
    title: "Smoke column reported above the ridge",
    body: "The first visible fire cue arrives before most households have checked official incident updates.",
    caption: "The map stores smoke direction and the first visible cue beside official incident records.",
    risk: "warning",
    cache: 78,
    signal: "Smoke column + slope exposure",
    spread: 48,
    routeStress: 52,
    officialConfidence: 86,
    recommendedAction: "Move from watch to ready posture; prepare to leave before route stress stacks.",
    evidence: [
      {
        label: "Incident source",
        source: "CAL FIRE",
        detail: "Incident data and evacuation layers are checked against official source language.",
        url: "https://www.fire.ca.gov/incidents"
      },
      {
        label: "Thermal cue",
        source: "NASA FIRMS",
        detail: "Satellite fire detection reference layer is treated as a signal, not an order.",
        url: "https://firms.modaps.eosdis.nasa.gov/map/"
      }
    ],
    failures: [
      {
        id: "late-awareness",
        title: "Visible smoke beat household awareness",
        text: "Neighborhood watch channels need one trusted alert relay, not scattered screenshots.",
        card: "Alert relay: assign one household per block to mirror official alerts into the offline packet."
      }
    ]
  },
  {
    time: "18:42",
    source: "Traffic and agency action log",
    title: "Primary ridge road slows to a crawl",
    body: "A remembered shortcut is unsafe after signal loss and downhill congestion collide.",
    caption: "Primary route stress is now visible; Afterlight keeps backup routes green only where official conditions still allow movement.",
    risk: "critical",
    cache: 84,
    signal: "Road stress + signal loss",
    spread: 68,
    routeStress: 79,
    officialConfidence: 89,
    recommendedAction: "Leave before the next stack: warning escalation, smoke shift, or blocked primary segment.",
    evidence: [
      {
        label: "Road stress",
        source: "Agency action log",
        detail: "The primary ridge route is treated as degraded after closure and congestion signals align.",
        url: "https://www.fire.ca.gov/incidents"
      },
      {
        label: "Map method",
        source: "ArcGIS dashboard pattern",
        detail: "Map indicators and event cards are kept in one decision surface.",
        url: "https://learn.arcgis.com/en/projects/make-a-dashboard-to-monitor-wildfires/"
      }
    ],
    failures: [
      {
        id: "route-failure",
        title: "The familiar route failed under real conditions",
        text: "Store route memory by condition: wind, fire direction, signal, school traffic, and night visibility.",
        card: "Route memory: ridge road is not primary during wind-driven fire after 6 PM. Use valley connector if official alerts allow."
      },
      {
        id: "signal-gap",
        title: "Signal gap blocked route updates",
        text: "Households need pre-cached maps and a non-cell fallback meet point.",
        card: "Offline map: cache evacuation PDF, radio channel, and three no-signal decision points."
      }
    ]
  },
  {
    time: "19:16",
    source: "Community assistance log",
    title: "Two households need mobility help",
    body: "The help need was known locally but not visible in the moment of evacuation.",
    caption: "The system turns hidden assistance needs into a consent-based action layer before the next incident.",
    risk: "critical",
    cache: 89,
    signal: "Mobility help + route pressure",
    spread: 76,
    routeStress: 86,
    officialConfidence: 92,
    recommendedAction: "Activate assistance contact and route handoff while backup remains open.",
    evidence: [
      {
        label: "Assistance layer",
        source: "Household memory",
        detail: "Known mobility needs become a visible readiness object.",
        url: "https://www.fire.ca.gov/incidents"
      },
      {
        label: "Evacuation warning definition",
        source: "CAL FIRE",
        detail: "Warnings specifically matter for people needing extra time.",
        url: "https://www.fire.ca.gov/incidents"
      }
    ],
    failures: [
      {
        id: "help-need",
        title: "Known help needs were not operationalized",
        text: "Neighbors need a consent-based assistance roster that works without the internet.",
        card: "Help roster: confirm mobility, pet, medication, and transport needs each month with an offline copy captain."
      }
    ]
  },
  {
    time: "20:03",
    source: "Post-incident review",
    title: "Afterlight generates neighborhood memory",
    body: "Confirmed failures become practical cards for the next blackout, fire, storm, or heat event.",
    caption: "The replay becomes a living playbook: routes, sources, assistance needs, and leave-before signs.",
    risk: "recovery",
    cache: 96,
    signal: "Lessons preserved",
    spread: 82,
    routeStress: 58,
    officialConfidence: 94,
    recommendedAction: "Review cards quarterly and rerun the source chain before fire season.",
    evidence: [
      {
        label: "Review loop",
        source: "After-action packet",
        detail: "Failures are preserved as future route rules and household cards.",
        url: "https://fsri.org/research-update/southern-california-fires-timeline-report"
      },
      {
        label: "Official caveat",
        source: "CAL FIRE",
        detail: "Incident data can change; emergency orders still come from authorities.",
        url: "https://www.fire.ca.gov/incidents"
      }
    ],
    failures: [
      {
        id: "memory-loss",
        title: "Lessons are usually lost after adrenaline fades",
        text: "Afterlight preserves what failed as action cards, route rules, and offline map layers.",
        card: "Quarterly replay: review route failures, alert relay, supply cache, and help roster before fire season."
      }
    ]
  }
];

export function getAllFailures() {
  return replayEvents.flatMap((event) => event.failures);
}
