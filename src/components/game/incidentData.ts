/**
 * Incident Data - Crime types, fire types, and their descriptions
 * Comprehensive incident system for city simulation
 */

import { msg } from 'gt-next';

// ============================================================================
// CRIME TYPES
// ============================================================================

export type CrimeType =
  // Violent Crimes
  | 'armed_robbery'
  | 'mugging'
  | 'assault'
  | 'aggravated_assault'
  | 'carjacking'
  | 'kidnapping'
  | 'hostage_situation'
  | 'gang_violence'
  | 'shooting'
  | 'stabbing'
  
  // Property Crimes
  | 'burglary'
  | 'home_invasion'
  | 'commercial_burglary'
  | 'car_theft'
  | 'bike_theft'
  | 'package_theft'
  | 'shoplifting'
  | 'smash_and_grab'
  | 'warehouse_theft'
  | 'construction_theft'
  
  // Financial Crimes
  | 'fraud'
  | 'identity_theft'
  | 'credit_card_fraud'
  | 'insurance_fraud'
  | 'embezzlement'
  | 'counterfeiting'
  
  // Public Order
  | 'disturbance'
  | 'public_intoxication'
  | 'disorderly_conduct'
  | 'noise_complaint'
  | 'loitering'
  | 'trespassing'
  | 'public_urination'
  | 'street_racing'
  | 'illegal_dumping'
  
  // Drug Related
  | 'drug_dealing'
  | 'drug_possession'
  | 'illegal_dispensary'
  | 'public_drug_use'
  
  // Traffic & Vehicle
  | 'hit_and_run'
  | 'dui'
  | 'reckless_driving'
  | 'traffic_violation'
  | 'parking_violation'
  | 'illegal_street_vendor'
  
  // Vandalism & Destruction
  | 'vandalism'
  | 'graffiti'
  | 'arson_attempt'
  | 'property_damage'
  | 'broken_windows'
  
  // Other
  | 'suspicious_activity'
  | 'prowler'
  | 'stalking'
  | 'domestic_disturbance'
  | 'animal_cruelty'
  | 'illegal_gambling'
  | 'prostitution'
  | 'solicitation';

interface CrimeData {
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  duration: number; // seconds before incident expires if unresponded
  weight: number; // relative spawn frequency (higher = more common)
}

const CRIME_DATA: Record<CrimeType, CrimeData> = {
  // Violent Crimes (critical/high severity, longer duration)
  armed_robbery: {
    name: msg('Armed Robbery'),
    description: msg('Armed suspect threatening civilians. Weapon drawn.'),
    severity: 'critical',
    duration: 45,
    weight: 3,
  },
  mugging: {
    name: msg('Mugging'),
    description: msg('Victim being robbed on the street. Suspect fleeing.'),
    severity: 'high',
    duration: 30,
    weight: 5,
  },
  assault: {
    name: msg('Assault'),
    description: msg('Physical altercation in progress. Multiple individuals.'),
    severity: 'high',
    duration: 25,
    weight: 6,
  },
  aggravated_assault: {
    name: msg('Aggravated Assault'),
    description: msg('Violent attack with potential weapon. Victim injured.'),
    severity: 'critical',
    duration: 40,
    weight: 2,
  },
  carjacking: {
    name: msg('Carjacking'),
    description: msg('Armed suspect stealing vehicle from driver.'),
    severity: 'critical',
    duration: 35,
    weight: 2,
  },
  kidnapping: {
    name: msg('Kidnapping'),
    description: msg('Individual being forced into vehicle. Urgent response.'),
    severity: 'critical',
    duration: 50,
    weight: 1,
  },
  hostage_situation: {
    name: msg('Hostage Situation'),
    description: msg('Armed suspect holding hostages. Negotiator needed.'),
    severity: 'critical',
    duration: 60,
    weight: 0.5,
  },
  gang_violence: {
    name: msg('Gang Violence'),
    description: msg('Rival groups in confrontation. Multiple suspects.'),
    severity: 'critical',
    duration: 40,
    weight: 2,
  },
  shooting: {
    name: msg('Shots Fired'),
    description: msg('Gunshots reported. Possible casualties.'),
    severity: 'critical',
    duration: 45,
    weight: 1,
  },
  stabbing: {
    name: msg('Stabbing'),
    description: msg('Knife attack reported. Medical response needed.'),
    severity: 'critical',
    duration: 40,
    weight: 1.5,
  },

  // Property Crimes (medium/high severity)
  burglary: {
    name: msg('Burglary'),
    description: msg('Break-in detected. Suspect inside building.'),
    severity: 'high',
    duration: 30,
    weight: 8,
  },
  home_invasion: {
    name: msg('Home Invasion'),
    description: msg('Intruder in occupied residence. Residents in danger.'),
    severity: 'critical',
    duration: 35,
    weight: 3,
  },
  commercial_burglary: {
    name: msg('Commercial Burglary'),
    description: msg('Business break-in in progress. Alarm triggered.'),
    severity: 'high',
    duration: 28,
    weight: 6,
  },
  car_theft: {
    name: msg('Car Theft'),
    description: msg('Vehicle being stolen. Suspect breaking into car.'),
    severity: 'medium',
    duration: 22,
    weight: 10,
  },
  bike_theft: {
    name: msg('Bike Theft'),
    description: msg('Bicycle being stolen. Suspect cutting lock.'),
    severity: 'low',
    duration: 15,
    weight: 12,
  },
  package_theft: {
    name: msg('Package Theft'),
    description: msg('Porch pirate stealing delivered packages.'),
    severity: 'low',
    duration: 12,
    weight: 15,
  },
  shoplifting: {
    name: msg('Shoplifting'),
    description: msg('Theft in progress at retail store. Suspect fleeing.'),
    severity: 'low',
    duration: 15,
    weight: 20,
  },
  smash_and_grab: {
    name: msg('Smash & Grab'),
    description: msg('Window smashed. Multiple suspects grabbing merchandise.'),
    severity: 'high',
    duration: 25,
    weight: 4,
  },
  warehouse_theft: {
    name: msg('Warehouse Theft'),
    description: msg('Large-scale theft at industrial facility.'),
    severity: 'high',
    duration: 35,
    weight: 3,
  },
  construction_theft: {
    name: msg('Construction Theft'),
    description: msg('Equipment or materials being stolen from site.'),
    severity: 'medium',
    duration: 25,
    weight: 5,
  },

  // Financial Crimes
  fraud: {
    name: msg('Fraud'),
    description: msg('Suspected fraud scheme. Victim reporting financial loss.'),
    severity: 'medium',
    duration: 30,
    weight: 4,
  },
  identity_theft: {
    name: msg('Identity Theft'),
    description: msg('Personal information being used fraudulently.'),
    severity: 'medium',
    duration: 30,
    weight: 3,
  },
  credit_card_fraud: {
    name: msg('Credit Card Fraud'),
    description: msg('Unauthorized card transactions in progress.'),
    severity: 'medium',
    duration: 25,
    weight: 5,
  },
  insurance_fraud: {
    name: msg('Insurance Fraud'),
    description: msg('Staged accident or false claim detected.'),
    severity: 'medium',
    duration: 35,
    weight: 2,
  },
  embezzlement: {
    name: msg('Embezzlement'),
    description: msg('Employee caught stealing company funds.'),
    severity: 'high',
    duration: 40,
    weight: 1,
  },
  counterfeiting: {
    name: msg('Counterfeiting'),
    description: msg('Fake currency or goods being distributed.'),
    severity: 'high',
    duration: 35,
    weight: 2,
  },

  // Public Order (low/medium severity, short duration)
  disturbance: {
    name: msg('Public Disturbance'),
    description: msg('Loud argument escalating. Crowd gathering.'),
    severity: 'low',
    duration: 18,
    weight: 25,
  },
  public_intoxication: {
    name: msg('Public Intoxication'),
    description: msg('Heavily intoxicated individual causing disruption.'),
    severity: 'low',
    duration: 15,
    weight: 18,
  },
  disorderly_conduct: {
    name: msg('Disorderly Conduct'),
    description: msg('Individual refusing to comply. Causing scene.'),
    severity: 'low',
    duration: 18,
    weight: 15,
  },
  noise_complaint: {
    name: msg('Noise Complaint'),
    description: msg('Excessive noise disturbing neighborhood.'),
    severity: 'low',
    duration: 12,
    weight: 20,
  },
  loitering: {
    name: msg('Loitering'),
    description: msg('Suspicious individuals hanging around property.'),
    severity: 'low',
    duration: 10,
    weight: 12,
  },
  trespassing: {
    name: msg('Trespassing'),
    description: msg('Unauthorized person on private property.'),
    severity: 'low',
    duration: 15,
    weight: 14,
  },
  public_urination: {
    name: msg('Public Urination'),
    description: msg('Indecent act in public area.'),
    severity: 'low',
    duration: 8,
    weight: 10,
  },
  street_racing: {
    name: msg('Street Racing'),
    description: msg('Vehicles racing at dangerous speeds.'),
    severity: 'high',
    duration: 20,
    weight: 4,
  },
  illegal_dumping: {
    name: msg('Illegal Dumping'),
    description: msg('Unauthorized waste being dumped.'),
    severity: 'low',
    duration: 20,
    weight: 6,
  },

  // Drug Related
  drug_dealing: {
    name: msg('Drug Deal'),
    description: msg('Suspected narcotics transaction in progress.'),
    severity: 'high',
    duration: 20,
    weight: 8,
  },
  drug_possession: {
    name: msg('Drug Possession'),
    description: msg('Individual with suspected controlled substances.'),
    severity: 'medium',
    duration: 18,
    weight: 10,
  },
  illegal_dispensary: {
    name: msg('Illegal Dispensary'),
    description: msg('Unlicensed drug operation discovered.'),
    severity: 'high',
    duration: 35,
    weight: 2,
  },
  public_drug_use: {
    name: msg('Public Drug Use'),
    description: msg('Individual using substances openly.'),
    severity: 'low',
    duration: 15,
    weight: 12,
  },

  // Traffic & Vehicle
  hit_and_run: {
    name: msg('Hit & Run'),
    description: msg('Driver fled after collision. Possible injuries.'),
    severity: 'high',
    duration: 25,
    weight: 6,
  },
  dui: {
    name: msg('DUI'),
    description: msg('Suspected impaired driver. Erratic behavior.'),
    severity: 'high',
    duration: 22,
    weight: 7,
  },
  reckless_driving: {
    name: msg('Reckless Driving'),
    description: msg('Vehicle driving dangerously. Endangering others.'),
    severity: 'medium',
    duration: 18,
    weight: 10,
  },
  traffic_violation: {
    name: msg('Traffic Violation'),
    description: msg('Moving violation observed. Driver being cited.'),
    severity: 'low',
    duration: 12,
    weight: 25,
  },
  parking_violation: {
    name: msg('Parking Violation'),
    description: msg('Illegally parked vehicle blocking access.'),
    severity: 'low',
    duration: 10,
    weight: 20,
  },
  illegal_street_vendor: {
    name: msg('Illegal Vendor'),
    description: msg('Unlicensed vendor operating without permit.'),
    severity: 'low',
    duration: 15,
    weight: 8,
  },

  // Vandalism & Destruction
  vandalism: {
    name: msg('Vandalism'),
    description: msg('Property being damaged or destroyed.'),
    severity: 'medium',
    duration: 18,
    weight: 12,
  },
  graffiti: {
    name: msg('Graffiti'),
    description: msg('Individual spray painting building or surface.'),
    severity: 'low',
    duration: 15,
    weight: 15,
  },
  arson_attempt: {
    name: msg('Attempted Arson'),
    description: msg('Individual attempting to start fire. Urgent.'),
    severity: 'critical',
    duration: 30,
    weight: 2,
  },
  property_damage: {
    name: msg('Property Damage'),
    description: msg('Intentional destruction of property in progress.'),
    severity: 'medium',
    duration: 20,
    weight: 8,
  },
  broken_windows: {
    name: msg('Broken Windows'),
    description: msg('Windows being smashed. Possible burglary.'),
    severity: 'medium',
    duration: 18,
    weight: 10,
  },

  // Other
  suspicious_activity: {
    name: msg('Suspicious Activity'),
    description: msg('Unknown individual acting strangely near building.'),
    severity: 'low',
    duration: 15,
    weight: 18,
  },
  prowler: {
    name: msg('Prowler'),
    description: msg('Individual lurking around property at night.'),
    severity: 'medium',
    duration: 18,
    weight: 8,
  },
  stalking: {
    name: msg('Stalking'),
    description: msg('Person being followed by unknown individual.'),
    severity: 'high',
    duration: 25,
    weight: 3,
  },
  domestic_disturbance: {
    name: msg('Domestic Disturbance'),
    description: msg('Heated argument at residence. Possible violence.'),
    severity: 'high',
    duration: 25,
    weight: 10,
  },
  animal_cruelty: {
    name: msg('Animal Cruelty'),
    description: msg('Animal being mistreated or endangered.'),
    severity: 'medium',
    duration: 20,
    weight: 3,
  },
  illegal_gambling: {
    name: msg('Illegal Gambling'),
    description: msg('Unlicensed gambling operation discovered.'),
    severity: 'medium',
    duration: 30,
    weight: 2,
  },
  prostitution: {
    name: msg('Prostitution'),
    description: msg('Illegal activity reported in area.'),
    severity: 'medium',
    duration: 20,
    weight: 4,
  },
  solicitation: {
    name: msg('Solicitation'),
    description: msg('Aggressive soliciting of passersby.'),
    severity: 'low',
    duration: 12,
    weight: 8,
  },
};

// Get all crime types as an array (internal)
const CRIME_TYPES = Object.keys(CRIME_DATA) as CrimeType[];

// Get a weighted random crime type
export function getRandomCrimeType(): CrimeType {
  const totalWeight = CRIME_TYPES.reduce((sum, type) => sum + CRIME_DATA[type].weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const type of CRIME_TYPES) {
    random -= CRIME_DATA[type].weight;
    if (random <= 0) {
      return type;
    }
  }
  
  return CRIME_TYPES[0];
}

// ============================================================================
// FIRE TYPES
// ============================================================================

type FireType =
  | 'structural'
  | 'electrical'
  | 'kitchen'
  | 'industrial'
  | 'chemical'
  | 'vehicle'
  | 'brush'
  | 'explosion'
  | 'gas_leak'
  | 'arson';

interface FireData {
  name: string;
  description: string;
  severity: 'minor' | 'moderate' | 'major' | 'catastrophic';
}

const FIRE_DATA: Record<FireType, FireData> = {
  structural: {
    name: msg('Structure Fire'),
    description: msg('Flames spreading through building. Multiple floors at risk. Evacuate immediately.'),
    severity: 'major',
  },
  electrical: {
    name: msg('Electrical Fire'),
    description: msg('Electrical system overload. Smoke billowing from outlets. Power lines sparking.'),
    severity: 'moderate',
  },
  kitchen: {
    name: msg('Kitchen Fire'),
    description: msg('Cooking fire out of control. Grease flames spreading rapidly. Ventilation compromised.'),
    severity: 'moderate',
  },
  industrial: {
    name: msg('Industrial Fire'),
    description: msg('Factory blaze with heavy smoke. Hazardous materials may be involved. Wide perimeter needed.'),
    severity: 'catastrophic',
  },
  chemical: {
    name: msg('Chemical Fire'),
    description: msg('Toxic chemical combustion. Dangerous fumes spreading. Specialized response required.'),
    severity: 'catastrophic',
  },
  vehicle: {
    name: msg('Vehicle Fire'),
    description: msg('Car engulfed in flames. Risk of fuel tank explosion. Keep clear.'),
    severity: 'minor',
  },
  brush: {
    name: msg('Brush Fire'),
    description: msg('Vegetation fire spreading with wind. Nearby structures threatened.'),
    severity: 'moderate',
  },
  explosion: {
    name: msg('Explosion'),
    description: msg('Building rocked by blast. Structural integrity compromised. Possible casualties.'),
    severity: 'catastrophic',
  },
  gas_leak: {
    name: msg('Gas Fire'),
    description: msg('Natural gas ignited. Continuous flame from leak. Shut-off valve needed.'),
    severity: 'major',
  },
  arson: {
    name: msg('Arson Fire'),
    description: msg('Deliberately set fire detected. Accelerant used. Fire spreading rapidly.'),
    severity: 'major',
  },
};

const FIRE_TYPES = Object.keys(FIRE_DATA) as FireType[];

// Get a random fire type (weighted toward structural/electrical for realism) - internal use
function getRandomFireType(): FireType {
  const weights: Record<FireType, number> = {
    structural: 25,
    electrical: 20,
    kitchen: 15,
    industrial: 8,
    chemical: 3,
    vehicle: 10,
    brush: 5,
    explosion: 2,
    gas_leak: 7,
    arson: 5,
  };
  
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  let random = Math.random() * totalWeight;
  
  for (const [type, weight] of Object.entries(weights)) {
    random -= weight;
    if (random <= 0) {
      return type as FireType;
    }
  }
  
  return 'structural';
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function getCrimeName(crimeType: CrimeType): string {
  return CRIME_DATA[crimeType]?.name || msg('Unknown Incident');
}

export function getCrimeDescription(crimeType: CrimeType): string {
  return CRIME_DATA[crimeType]?.description || msg('Incident reported.');
}

export function getCrimeDuration(crimeType: CrimeType): number {
  return CRIME_DATA[crimeType]?.duration || 20;
}

export function getFireName(fireType: FireType): string {
  return FIRE_DATA[fireType]?.name || msg('Fire');
}

export function getFireDescription(fireType: FireType): string {
  return FIRE_DATA[fireType]?.description || msg('Building on fire. Fire trucks responding.');
}

// Get fire description based on tile coordinates (deterministic)
export function getFireDescriptionForTile(x: number, y: number): string {
  // Use coordinates to deterministically pick a fire type
  const index = Math.abs((x * 31 + y * 17) % FIRE_TYPES.length);
  return FIRE_DATA[FIRE_TYPES[index]].description;
}

// Get fire name based on tile coordinates (deterministic)
export function getFireNameForTile(x: number, y: number): string {
  const index = Math.abs((x * 31 + y * 17) % FIRE_TYPES.length);
  return FIRE_DATA[FIRE_TYPES[index]].name;
}
