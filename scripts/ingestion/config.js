// Configuration for Kerala Mosque Ingestion Pipeline

export const CONFIG = {
  appName: 'SalahNear Kerala Mosque Ingestion Pipeline',
  userAgent: 'SalahNearIngestion/1.0 (contact@salahnear.app; https://github.com/salahnear)',

  overpassEndpoints: [
    'https://overpass-api.de/api/interpreter',
    'https://lz4.overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
  ],

  // Kerala Bounding Box: [minLat, minLon, maxLat, maxLon]
  keralaBoundingBox: [8.18, 74.85, 12.85, 77.40],

  // 14 Districts of Kerala with geographic bounding boxes [minLat, minLon, maxLat, maxLon] & centroid
  districts: {
    'Kasaragod': {
      bbox: [12.05, 74.85, 12.85, 75.45],
      centroid: [12.5102, 74.9852],
    },
    'Kannur': {
      bbox: [11.65, 75.15, 12.25, 75.95],
      centroid: [11.8745, 75.3704],
    },
    'Wayanad': {
      bbox: [11.50, 75.80, 11.95, 76.45],
      centroid: [11.6854, 76.1320],
    },
    'Kozhikode': {
      bbox: [11.10, 75.60, 11.75, 76.15],
      centroid: [11.2588, 75.7804],
    },
    'Malappuram': {
      bbox: [10.70, 75.80, 11.45, 76.55],
      centroid: [11.0722, 76.0711],
    },
    'Palakkad': {
      bbox: [10.35, 76.20, 11.25, 76.95],
      centroid: [10.7867, 76.6548],
    },
    'Thrissur': {
      bbox: [10.15, 75.95, 10.85, 76.60],
      centroid: [10.5276, 76.2144],
    },
    'Ernakulam': {
      bbox: [9.75, 76.15, 10.35, 77.05],
      centroid: [9.9816, 76.2999],
    },
    'Idukki': {
      bbox: [9.25, 76.60, 10.35, 77.40],
      centroid: [9.8500, 76.9700],
    },
    'Kottayam': {
      bbox: [9.35, 76.35, 9.85, 76.95],
      centroid: [9.5916, 76.5222],
    },
    'Alappuzha': {
      bbox: [9.05, 76.20, 9.85, 76.65],
      centroid: [9.4981, 76.3388],
    },
    'Pathanamthitta': {
      bbox: [9.05, 76.45, 9.55, 77.25],
      centroid: [9.2648, 76.7870],
    },
    'Kollam': {
      bbox: [8.75, 76.40, 9.25, 77.25],
      centroid: [8.8932, 76.6141],
    },
    'Thiruvananthapuram': {
      bbox: [8.25, 76.65, 8.85, 77.35],
      centroid: [8.5241, 76.9366],
    },
  },

  defaultAttendanceRadiusMeters: 100,
  defaultTimezone: 'Asia/Kolkata',

  // Proximity threshold for merging duplicate nodes/ways (in meters)
  deduplicationDistanceThresholdMeters: 40,
};
