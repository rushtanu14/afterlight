import {
  createRoutePlan,
  defaultRoutePlan,
  type ArchiveReference,
  type HistoricalEvent,
  type HistoricalScenario,
  type HistoricalScenarioId,
  type IncidentMapGeometry,
  type OfficialRecord,
  type RouteOption
} from "./replay";

type EventInput = Omit<HistoricalEvent, "displayTime" | "sourceText" | "routePlan"> & {
  routeChanges?: Partial<RouteOption>[];
};

const fsriPageUrl = "https://fsri.org/research-update/southern-california-fires-timeline-report";
const fsriSheetUrl = "https://docs.google.com/spreadsheets/d/1Xna6okyL59bk3m6oHphZrN-RWWxOtnBIL0R5EpaZ__4/edit";
const eatonTimelineUrl = "https://file.lacounty.gov/SDSInter/lac/1191567_EatonFireTimelineOverview.pdf";
const perimeterServiceUrl =
  "https://services.arcgis.com/RmCCgQtiZLDCtblq/arcgis/rest/services/Palisades_and_Eaton_Dissolved_Fire_Perimeters_as_of_20250121/FeatureServer";
const perimeterSourceUrl = "https://hub.arcgis.com/maps/ad51845ea5fb4eb483bc2a7c38b2370c";

function displayTime(timestamp: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/Los_Angeles"
  }).format(new Date(timestamp));
}

function officialRecord(
  sourceDescription: string,
  eventDate: string,
  eventTime: string,
  incidentName: string,
  eventLocation: string,
  eventUnits: string,
  eventDescription: string
): OfficialRecord {
  return { sourceDescription, eventDate, eventTime, incidentName, eventLocation, eventUnits, eventDescription };
}

function namedRoutePlan(
  primaryRouteName: string,
  backupRouteName: string,
  alternateBackupRouteName: string,
  routeChanges: Partial<RouteOption>[] = []
) {
  const plan = routeChanges.length > 0 ? createRoutePlan(routeChanges) : defaultRoutePlan;

  return {
    ...plan,
    routes: plan.routes.map((route) => {
      if (route.id === "ridge") return { ...route, name: primaryRouteName };
      if (route.id === "coast") return { ...route, name: backupRouteName };
      if (route.id === "valley") return { ...route, name: alternateBackupRouteName };
      return route;
    })
  };
}

function sourceEvent(primaryRouteName: string, backupRouteName: string, alternateBackupRouteName: string, input: EventInput): HistoricalEvent {
  const { routeChanges, ...event } = input;

  return {
    ...event,
    displayTime: displayTime(input.timestamp),
    sourceText: input.officialRecord.eventDescription,
    routePlan: namedRoutePlan(primaryRouteName, backupRouteName, alternateBackupRouteName, routeChanges)
  };
}

const palisadesRoutes = {
  primary: "Palisades Drive",
  backup: "Pacific Coast Highway",
  alternate: "Topanga Canyon Boulevard"
};

const eatonRoutes = {
  primary: "Lake Avenue",
  backup: "Foothill Boulevard",
  alternate: "Angeles Crest Highway"
};

const palisadesRoadSnapshots = [
  {
    id: "palisades-pch",
    label: "Pacific Coast Highway",
    role: "backup",
    source: "OpenStreetMap API 0.6 way/full",
    wayIds: [404024403, 397516900],
    wayUrls: ["https://www.openstreetmap.org/way/404024403", "https://www.openstreetmap.org/way/397516900"],
    capturedOn: "2026-06-30",
    attribution: "© OpenStreetMap contributors",
    licenseUrl: "https://opendatacommons.org/licenses/odbl/1-0/",
    paths: [
      [
        [34.029285, -118.52143],
        [34.029995, -118.522693],
        [34.031023, -118.524572],
        [34.031199, -118.524913],
        [34.031417, -118.525402]
      ],
      [
        [34.038901, -118.542445],
        [34.038923, -118.542559],
        [34.03905, -118.54323],
        [34.039419, -118.544409],
        [34.0395, -118.544761],
        [34.039546, -118.545041],
        [34.039578, -118.54531]
      ]
    ]
  },
  {
    id: "palisades-topanga",
    label: "Topanga Canyon Boulevard",
    role: "alternate",
    source: "OpenStreetMap API 0.6 way/full",
    wayIds: [38311860, 38311861],
    wayUrls: ["https://www.openstreetmap.org/way/38311860", "https://www.openstreetmap.org/way/38311861"],
    capturedOn: "2026-06-30",
    attribution: "© OpenStreetMap contributors",
    licenseUrl: "https://opendatacommons.org/licenses/odbl/1-0/",
    paths: [
      [
        [34.140011, -118.602649],
        [34.140904, -118.603064],
        [34.141695, -118.60351],
        [34.141695, -118.60407],
        [34.141279, -118.604279],
        [34.140749, -118.60437],
        [34.140656, -118.604933],
        [34.141469, -118.607913],
        [34.141839, -118.60817],
        [34.142105, -118.607938],
        [34.142033, -118.607426],
        [34.141551, -118.606603],
        [34.141774, -118.605383],
        [34.142279, -118.605349],
        [34.142748, -118.605576]
      ],
      [
        [34.135656, -118.598893],
        [34.134063, -118.598761],
        [34.131962, -118.599439],
        [34.131095, -118.599568],
        [34.130349, -118.599328],
        [34.129873, -118.599439],
        [34.129134, -118.600297],
        [34.128644, -118.600529],
        [34.128224, -118.60028],
        [34.128054, -118.599842],
        [34.128018, -118.598778],
        [34.127699, -118.598366],
        [34.127244, -118.598426],
        [34.126967, -118.598847],
        [34.126943, -118.599613],
        [34.126789, -118.600135],
        [34.126426, -118.600452],
        [34.125867, -118.600446]
      ]
    ]
  }
] satisfies IncidentMapGeometry["roadSnapshots"];

const eatonRoadSnapshots = [
  {
    id: "eaton-lake",
    label: "Lake Avenue",
    role: "primary",
    source: "OpenStreetMap API 0.6 way/full",
    wayIds: [402438917],
    wayUrls: ["https://www.openstreetmap.org/way/402438917"],
    capturedOn: "2026-06-30",
    attribution: "© OpenStreetMap contributors",
    licenseUrl: "https://opendatacommons.org/licenses/odbl/1-0/",
    paths: [
      [
        [34.177476, -118.131883],
        [34.178021, -118.131859]
      ]
    ]
  },
  {
    id: "eaton-foothill",
    label: "Foothill Boulevard",
    role: "backup",
    source: "OpenStreetMap API 0.6 way/full",
    wayIds: [1525403157, 405373665, 405373639],
    wayUrls: [
      "https://www.openstreetmap.org/way/1525403157",
      "https://www.openstreetmap.org/way/405373665",
      "https://www.openstreetmap.org/way/405373639"
    ],
    capturedOn: "2026-06-30",
    attribution: "© OpenStreetMap contributors",
    licenseUrl: "https://opendatacommons.org/licenses/odbl/1-0/",
    paths: [
      [
        [34.149837, -118.100608],
        [34.149813, -118.100988],
        [34.149711, -118.101493],
        [34.149617, -118.101949],
        [34.149576, -118.102257],
        [34.149562, -118.102969],
        [34.149561, -118.10323],
        [34.14956, -118.103504],
        [34.149558, -118.104157],
        [34.149555, -118.105096],
        [34.149555, -118.105767],
        [34.149564, -118.10594]
      ],
      [
        [34.149882, -118.09482],
        [34.149879, -118.094995],
        [34.149875, -118.095324],
        [34.149871, -118.095512],
        [34.149863, -118.096104],
        [34.149854, -118.096622],
        [34.149839, -118.097615],
        [34.14983, -118.098179]
      ],
      [
        [34.149819, -118.100363],
        [34.149834, -118.100555],
        [34.149836, -118.100586],
        [34.149837, -118.100608]
      ]
    ]
  },
  {
    id: "eaton-angeles",
    label: "Angeles Crest Highway",
    role: "alternate",
    source: "OpenStreetMap API 0.6 way/full",
    wayIds: [521384288],
    wayUrls: ["https://www.openstreetmap.org/way/521384288"],
    capturedOn: "2026-06-30",
    attribution: "© OpenStreetMap contributors",
    licenseUrl: "https://opendatacommons.org/licenses/odbl/1-0/",
    paths: [
      [
        [34.220038, -118.191063],
        [34.219714, -118.19058],
        [34.219285, -118.18987],
        [34.219211, -118.189784],
        [34.218992, -118.189584],
        [34.218857, -118.189506],
        [34.218688, -118.189441],
        [34.218509, -118.189419],
        [34.218307, -118.189436],
        [34.218111, -118.189494],
        [34.217947, -118.189573],
        [34.217721, -118.189782],
        [34.217457, -118.190157],
        [34.217418, -118.190204]
      ]
    ]
  }
] satisfies IncidentMapGeometry["roadSnapshots"];

const palisadesMapGeometry: IncidentMapGeometry = {
  center: { latitude: 34.055, longitude: -118.553 },
  zoom: 12,
  bbox: [34.0, -118.64, 34.14, -118.48],
  perimeterLayer: {
    label: "Palisades dissolved fire perimeter, as of Jan 21 2025",
    serviceUrl: perimeterServiceUrl,
    layerId: 1,
    sourceUrl: perimeterSourceUrl
  },
  points: [
    { id: "palisades-household", label: "Illustrative Pacific Palisades household anchor", latitude: 34.0555, longitude: -118.5455, kind: "household", provenance: "illustrative_anchor" },
    { id: "palisades-origin", label: "Illustrative Palisades Dr / Calle Victoria source anchor", latitude: 34.079, longitude: -118.548, kind: "fire_origin", provenance: "illustrative_anchor" },
    { id: "topanga-pch", label: "Illustrative Topanga / Coastline warning-zone anchor", latitude: 34.086, longitude: -118.566, kind: "official_row", provenance: "illustrative_anchor" },
    { id: "palisades-pch-order", label: "Illustrative Palisades to PCH order anchor", latitude: 34.0435, longitude: -118.5525, kind: "official_row", provenance: "illustrative_anchor" },
    { id: "palisades-drive-blocked", label: "Illustrative Palisades Drive blocked-lanes anchor", latitude: 34.064, longitude: -118.545, kind: "official_row", provenance: "illustrative_anchor" }
  ],
  osmRoads: [
    { id: "ridge", label: palisadesRoutes.primary, roadName: "Palisades Drive", role: "primary", provenance: "illustrative_household_role" },
    { id: "coast", label: palisadesRoutes.backup, roadName: "Pacific Coast Highway", role: "backup", provenance: "illustrative_household_role" },
    { id: "valley", label: palisadesRoutes.alternate, roadName: "Topanga Canyon Boulevard", role: "alternate", provenance: "illustrative_household_role" }
  ],
  roadSnapshots: palisadesRoadSnapshots
};

const eatonMapGeometry: IncidentMapGeometry = {
  center: { latitude: 34.187, longitude: -118.121 },
  zoom: 12,
  bbox: [34.13, -118.22, 34.25, -118.05],
  perimeterLayer: {
    label: "Eaton dissolved fire perimeter, as of Jan 21 2025",
    serviceUrl: perimeterServiceUrl,
    layerId: 0,
    sourceUrl: perimeterSourceUrl
  },
  points: [
    { id: "eaton-household", label: "Illustrative Altadena household anchor", latitude: 34.1905, longitude: -118.132, kind: "household", provenance: "illustrative_anchor" },
    { id: "eaton-origin", label: "Illustrative Eaton Canyon source anchor", latitude: 34.1822, longitude: -118.0952, kind: "fire_origin", provenance: "illustrative_anchor" },
    { id: "eaton-altadena", label: "Illustrative Altadena / Pasadena alert-zone anchor", latitude: 34.1928, longitude: -118.1375, kind: "official_row", provenance: "illustrative_anchor" },
    { id: "eaton-kinneloa", label: "Illustrative Kinneloa / Eaton Canyon order anchor", latitude: 34.173, longitude: -118.095, kind: "official_row", provenance: "illustrative_anchor" }
  ],
  osmRoads: [
    { id: "ridge", label: eatonRoutes.primary, roadName: "North Lake Avenue", role: "primary", provenance: "illustrative_household_role" },
    { id: "coast", label: eatonRoutes.backup, roadName: "East Foothill Boulevard", role: "backup", provenance: "illustrative_household_role" },
    { id: "valley", label: eatonRoutes.alternate, roadName: "Angeles Crest Highway", role: "alternate", provenance: "illustrative_household_role" }
  ],
  roadSnapshots: eatonRoadSnapshots
};

const palisadesEvents: HistoricalEvent[] = [
  sourceEvent(palisadesRoutes.primary, palisadesRoutes.backup, palisadesRoutes.alternate, {
    id: "palisades-resident-only-closure",
    timestamp: "2025-01-07T09:42:00-08:00",
    title: "Resident-only closure appears before ignition",
    sourceLabel: "FSRI Palisades worksheet",
    sourceUrl: fsriSheetUrl,
    officialRecord: officialRecord(
      "LA County Sheriffs",
      "1/7/2025",
      "09:42",
      "Palisades",
      "Topanga Canyon Boulevard access points",
      "",
      "Resident Only Closure in effect for Topanga Canyon Boulevard due to anticipated extreme weather and wind conditions; closures listed at Topanga Canyon Blvd / Mulholland Dr, Old Topanga Canyon Rd / Mulholland Hwy, and Topanga Canyon Blvd / Pacific Coast Hwy."
    ),
    narrative: "The first useful sign is not flame. It is an official route constraint before the incident becomes visible.",
    officialSignal: "road_closure",
    mapPointId: "topanga-pch",
    mapReadings: {
      spreadLabel: "No confirmed fire yet",
      windLabel: "Extreme wind closure notice",
      roadLabel: "Resident-only closure at Topanga / PCH",
      alertLabel: "Closure before ignition"
    },
    routeChanges: [{ id: "valley", state: "access_restricted" }],
    failureLesson: "Soft closures are early route-fragility signals.",
    futureLesson: "Record official access changes as historical context for household preparedness review."
  }),
  sourceEvent(palisadesRoutes.primary, palisadesRoutes.backup, palisadesRoutes.alternate, {
    id: "palisades-fire-reported",
    timestamp: "2025-01-07T10:30:00-08:00",
    title: "Palisades vegetation fire reported",
    sourceLabel: "FSRI Palisades worksheet",
    sourceUrl: fsriSheetUrl,
    officialRecord: officialRecord(
      "LA County CEOC 214",
      "1/7/2025",
      "10:30",
      "Palisades",
      "Palisades Dr & Calle Victoria, Pacific Palisades",
      "",
      "2 fires reported - The vegetation Fire on Palisades Dr & Calle Victoria, Pacific Palisades and the Sunset Fire on West Sunset Bl, Los Angeles."
    ),
    narrative: "The official row establishes the incident and the first public-agency timestamp the replay should honor.",
    officialSignal: "incident_report",
    mapPointId: "palisades-origin",
    mapReadings: {
      spreadLabel: "Vegetation fire reported",
      windLabel: "Not stated in this row",
      roadLabel: "Palisades Drive / Calle Victoria",
      alertLabel: "Not stated in this row"
    },
    failureLesson: "The official start row becomes the clock anchor.",
    futureLesson: "Tie household plans to source timestamps, not estimated replay offsets."
  }),
  sourceEvent(palisadesRoutes.primary, palisadesRoutes.backup, palisadesRoutes.alternate, {
    id: "palisades-wind-alignment",
    timestamp: "2025-01-07T10:46:00-08:00",
    title: "Wind alignment threatens structures",
    sourceLabel: "FSRI Palisades worksheet",
    sourceUrl: fsriSheetUrl,
    officialRecord: officialRecord(
      "LFD Tac-5",
      "1/7/2025",
      "10:46",
      "Palisades",
      "",
      "HLCO to Metro",
      "This thing is already at two acres. It's 100% in alignment with the wind. It started at a ridge top and pushing directly towards the Palisades. This has the potential for 200 acres in the next 20 minutes. Will probably have an impact time into structures being threatened under 20 minutes."
    ),
    narrative: "The source row documents wind alignment and structure impact without converting them into a generic risk score.",
    officialSignal: "incident_report",
    mapPointId: "palisades-origin",
    mapReadings: {
      spreadLabel: "2 acres; potential 200 acres in 20 min",
      windLabel: "100% aligned with wind",
      roadLabel: "Pushing toward Palisades",
      alertLabel: "Structures threatened under 20 min"
    },
    failureLesson: "Fire behavior can outpace household packing time.",
    futureLesson: "Preserve the official wind-alignment language as historical evidence."
  }),
  sourceEvent(palisadesRoutes.primary, palisadesRoutes.backup, palisadesRoutes.alternate, {
    id: "palisades-warning-zones",
    timestamp: "2025-01-07T11:17:00-08:00",
    title: "Evacuation warnings issued for Topanga zones",
    sourceLabel: "FSRI Palisades worksheet",
    sourceUrl: fsriSheetUrl,
    officialRecord: officialRecord(
      "LA County CEOC 214",
      "1/7/2025",
      "11:17",
      "Palisades",
      "TOP-U007, TOP-U009, SSM-U010",
      "",
      "Evacuation warnings for TOP-U007, TOP-U009, SSM-U010 for Palisades Fire, including Topanga Elementary School surroundings, Fernwood and Wildwood communities, and Coastline Drive up to West Clifftop Way."
    ),
    narrative: "The product switches out of passive monitoring when official warning zones appear.",
    officialSignal: "evacuation_warning",
    mapPointId: "topanga-pch",
    mapReadings: {
      spreadLabel: "Evacuation warning zones active",
      windLabel: "Not stated in this row",
      roadLabel: "Topanga / Coastline zones warned",
      alertLabel: "TOP-U007, TOP-U009, SSM-U010"
    },
    failureLesson: "Official warning zones mark the first action-state row in this historical replay.",
    futureLesson: "Review how the historical warning row overlapped known household support needs and constrained roads."
  }),
  sourceEvent(palisadesRoutes.primary, palisadesRoutes.backup, palisadesRoutes.alternate, {
    id: "palisades-order-to-pch",
    timestamp: "2025-01-07T11:29:00-08:00",
    title: "Evacuation order extends to PCH",
    sourceLabel: "FSRI Palisades worksheet",
    sourceUrl: fsriSheetUrl,
    officialRecord: officialRecord(
      "LFD Tac-5",
      "1/7/2025",
      "11:29",
      "Palisades",
      "Palisades to PCH",
      "LFD CM to Metro",
      "We're deputy IC on the Palisades incident. We're going to need an evacuation order all the way to PCH. Metro confirms: evacuation order all the way down to PCH."
    ),
    narrative: "This is the actual order timestamp. Afterlight should show it plainly, not hide it behind 'Signal 4'.",
    officialSignal: "evacuation_order",
    mapPointId: "palisades-pch-order",
    mapReadings: {
      spreadLabel: "Order extends to PCH",
      windLabel: "Not stated in this row",
      roadLabel: "Palisades to PCH evacuation order",
      alertLabel: "Evacuation order"
    },
    failureLesson: "The order arrives after warning and route pressure have already stacked.",
    futureLesson: "Record that this historical order followed a warning row and increasing route pressure."
  }),
  sourceEvent(palisadesRoutes.primary, palisadesRoutes.backup, palisadesRoutes.alternate, {
    id: "palisades-drive-blocked",
    timestamp: "2025-01-07T11:42:00-08:00",
    title: "Traffic blocks all lanes on Palisades Drive",
    sourceLabel: "FSRI Palisades worksheet",
    sourceUrl: fsriSheetUrl,
    officialRecord: officialRecord(
      "LAC V-1",
      "1/7/2025",
      "11:42",
      "Palisades",
      "Palisades Drive",
      "TF1041 to OSC",
      "All companies at the bottom of Palisades Drive are unable to come up. Traffic has completely blocked all four lanes. We need to start getting some cars off this hill so we can get companies up."
    ),
    narrative: "The route failure is not theoretical. The official radio row says all four lanes were blocked.",
    officialSignal: "road_closure",
    mapPointId: "palisades-drive-blocked",
    mapReadings: {
      spreadLabel: "Not stated in this row",
      windLabel: "Not stated in this row",
      roadLabel: "All four lanes blocked on Palisades Drive",
      alertLabel: "Route failure"
    },
    routeChanges: [{ id: "ridge", state: "blocked" }],
    failureLesson: "A route can become unusable while people still think of it as open.",
    futureLesson: "Preserve this official blocked-lanes row as historical route-failure evidence."
  })
];

const eatonEvents: HistoricalEvent[] = [
  sourceEvent(eatonRoutes.primary, eatonRoutes.backup, eatonRoutes.alternate, {
    id: "eaton-ready-to-evacuate-notice",
    timestamp: "2025-01-07T15:34:00-08:00",
    title: "County notice tells residents to be ready to evacuate",
    sourceLabel: "LA County Eaton timeline overview",
    sourceUrl: eatonTimelineUrl,
    officialRecord: officialRecord(
      "LA County high winds, fire and power outages notice",
      "1/7/2025",
      "3:34 PM",
      "Eaton",
      "Los Angeles County",
      "",
      "LA County high winds, fire and power outages notice encouraging residents to be ready to evacuate."
    ),
    narrative: "The official readiness notice is the first documented readiness row in this historical sequence.",
    officialSignal: "readiness_notice",
    mapPointId: "eaton-altadena",
    mapReadings: {
      spreadLabel: "Not stated in this row",
      windLabel: "High winds / power outage notice",
      roadLabel: "Not stated in this row",
      alertLabel: "Be ready to evacuate"
    },
    failureLesson: "The official readiness notice precedes the documented ignition row.",
    futureLesson: "Use the historical readiness notice to review household support needs before emergencies."
  }),
  sourceEvent(eatonRoutes.primary, eatonRoutes.backup, eatonRoutes.alternate, {
    id: "eaton-fire-starts",
    timestamp: "2025-01-07T18:17:00-08:00",
    title: "Eaton fire starts",
    sourceLabel: "LA County Eaton timeline overview",
    sourceUrl: eatonTimelineUrl,
    officialRecord: officialRecord(
      "Eaton fire starts",
      "1/7/2025",
      "6:17 PM",
      "Eaton",
      "Eaton Canyon / Altadena",
      "",
      "Eaton fire starts."
    ),
    narrative: "The replay clock now starts from the official LA County timeline timestamp.",
    officialSignal: "incident_report",
    mapPointId: "eaton-origin",
    mapReadings: {
      spreadLabel: "Fire start logged",
      windLabel: "Not stated in this row",
      roadLabel: "Eaton Canyon / Altadena",
      alertLabel: "Ignition row"
    },
    failureLesson: "The start timestamp is not an estimate; it comes from the official timeline.",
    futureLesson: "Compare future events against the official start-to-alert delay."
  }),
  sourceEvent(eatonRoutes.primary, eatonRoutes.backup, eatonRoutes.alternate, {
    id: "eaton-first-aware-alert",
    timestamp: "2025-01-07T18:48:00-08:00",
    title: "First public be-aware alert",
    sourceLabel: "FSRI Eaton worksheet",
    sourceUrl: fsriSheetUrl,
    officialRecord: officialRecord(
      "PBS warn alert",
      "1/7/2025",
      "18:48",
      "Eaton",
      "PAS-E014 to ALD-MENDOCINO-D zones",
      "",
      "LA County Office of Emergency Management: Fast moving wildfire in your area. BE AWARE of your surroundings and MONITOR the situation closely. Follow all instructions from first responders in the field. More information will be posted on alertla.org when available."
    ),
    narrative: "The first public alert is awareness, not an evacuation order. That gap matters for the detector story.",
    officialSignal: "awareness_alert",
    mapPointId: "eaton-altadena",
    mapReadings: {
      spreadLabel: "Fast-moving wildfire alert",
      windLabel: "Not stated in this row",
      roadLabel: "PAS / ALD alert zones",
      alertLabel: "BE AWARE"
    },
    failureLesson: "An awareness alert is distinct from an evacuation instruction.",
    futureLesson: "Compare the historical awareness alert with household support needs without treating it as current guidance."
  }),
  sourceEvent(eatonRoutes.primary, eatonRoutes.backup, eatonRoutes.alternate, {
    id: "eaton-order-prep",
    timestamp: "2025-01-07T19:00:00-08:00",
    title: "Orders needed; WEA being built",
    sourceLabel: "FSRI Eaton worksheet",
    sourceUrl: fsriSheetUrl,
    officialRecord: officialRecord(
      "LA County CEOC 214",
      "1/7/2025",
      "19:00",
      "Eaton",
      "",
      "",
      "Received call that Eaton Fire was growing and that orders needed to be sent out. Relieving Alert and warning individual sat with me while building out alert. Once accurate zone was received - WEA was launched at 1920 hours."
    ),
    narrative: "This row exposes the real operational delay between knowing orders are needed and launching the alert.",
    officialSignal: "alert_preparation",
    mapPointId: "eaton-altadena",
    mapReadings: {
      spreadLabel: "Fire growing; orders needed",
      windLabel: "Not stated in this row",
      roadLabel: "Alert being built",
      alertLabel: "WEA launched at 19:20"
    },
    failureLesson: "Operational alert-building time is part of the failure chain.",
    futureLesson: "Preserve the documented alert-building delay as historical process evidence."
  }),
  sourceEvent(eatonRoutes.primary, eatonRoutes.backup, eatonRoutes.alternate, {
    id: "eaton-first-order",
    timestamp: "2025-01-07T19:26:00-08:00",
    title: "First evacuation order: leave now",
    sourceLabel: "FSRI Eaton worksheet",
    sourceUrl: fsriSheetUrl,
    officialRecord: officialRecord(
      "PBS warn alert",
      "1/7/2025",
      "19:26",
      "Eaton",
      "KIN-KINNELOA-A/B, PAS-E019, ALD-EATONCANYON, ALD-MIDLOTHIAN, ALD-GARFIAS, ALD-EASTLOMA, ALD-MENDOCINO-A-D",
      "",
      "LA County Office of Emergency Management: FAST MOVING WILDFIRE IN YOUR AREA. AN EVACUATION ORDER HAS BEEN ISSUED FOR YOUR AREA. LEAVE NOW. More info at alertla.org."
    ),
    narrative: "This is the concrete official order row. The detector should name it directly.",
    officialSignal: "evacuation_order",
    mapPointId: "eaton-kinneloa",
    mapReadings: {
      spreadLabel: "Evacuation order zones active",
      windLabel: "Fast-moving wildfire",
      roadLabel: "Kinneloa / Altadena zones ordered",
      alertLabel: "LEAVE NOW"
    },
    failureLesson: "The first evacuation order arrives after local evacuations and ember exposure are already underway.",
    futureLesson: "Record that this historical order followed awareness and alert-building rows."
  }),
  sourceEvent(eatonRoutes.primary, eatonRoutes.backup, eatonRoutes.alternate, {
    id: "eaton-warning-expansion",
    timestamp: "2025-01-07T19:55:00-08:00",
    title: "Evacuation warning expands to additional zones",
    sourceLabel: "FSRI Eaton worksheet",
    sourceUrl: fsriSheetUrl,
    officialRecord: officialRecord(
      "PBS warn alert",
      "1/7/2025",
      "19:55",
      "Eaton",
      "PAS-E014 to ALD-MOUNTLOWE zones",
      "",
      "LA County Office of Emergency Management: FAST MOVING WILDFIRE IN THE AREA. AN EVACUATION WARNING HAS BEEN ISSUED. PREPARE TO LEAVE. More information at alertla.org."
    ),
    narrative: "The alert footprint expands. Afterlight should show that the official story is multiple timestamped rows, not one synthetic status.",
    officialSignal: "evacuation_warning",
    mapPointId: "eaton-altadena",
    mapReadings: {
      spreadLabel: "Warning footprint expands",
      windLabel: "Fast-moving wildfire",
      roadLabel: "PAS / ALD warning zones",
      alertLabel: "PREPARE TO LEAVE"
    },
    failureLesson: "Alert expansion is a sign that the failure chain is spreading across zones.",
    futureLesson: "Treat later warning-zone expansion as confirmation, not as the first action point."
  })
];

export const historicalScenarios: HistoricalScenario[] = [
  {
    id: "palisades-2025",
    name: "Palisades Fire",
    region: "Los Angeles County, California",
    sourceLabel: "FSRI Palisades worksheet",
    sourceUrl: fsriPageUrl,
    sourceNote: "Official-source timeline rows collected by FSRI from LA County, Los Angeles City, radio records, alerts, and cooperating agencies.",
    mapGeometry: palisadesMapGeometry,
    events: palisadesEvents
  },
  {
    id: "eaton-2025",
    name: "Eaton Fire",
    region: "Altadena and Pasadena, California",
    sourceLabel: "LA County / FSRI Eaton timeline",
    sourceUrl: eatonTimelineUrl,
    sourceNote: "Official LA County timeline overview plus FSRI Eaton worksheet rows from PBS WARN, CEOC, LASD, LAC radio, and agency records.",
    mapGeometry: eatonMapGeometry,
    events: eatonEvents
  }
];

export const archiveReferences: ArchiveReference[] = [
  {
    id: "camp-2018",
    name: "Camp Fire",
    sourceUrl: "https://www.fire.ca.gov/incidents/2018/11/8/camp-fire",
    evaluationStatus: "insufficient_official_rows"
  }
];

export function getHistoricalScenario(id: HistoricalScenarioId): HistoricalScenario;
export function getHistoricalScenario(id: string): HistoricalScenario;
export function getHistoricalScenario(id: string) {
  const scenario = historicalScenarios.find((candidate) => candidate.id === id);
  if (!scenario) throw new Error(`Unknown historical scenario: ${id}`);
  return scenario;
}
