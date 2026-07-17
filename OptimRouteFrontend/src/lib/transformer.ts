/**
 * Transforms the raw backend API response into the Route[] shape
 * that all frontend components expect (types.ts).
 */
import { Route, RouteLeg, Station, Stop, Train, TrainType } from '../types';

// ── Types that mirror the backend JSON ──────────────────────────────────────

interface BackendLeg {
  trainNo: number;
  trainName: string;
  fromStation: string;
  fromStationCode: string;
  departureTime: string;
  toStation: string;
  toStationCode: string;
  arrivalTime: string;
  distanceKm: number;
  midStations: string[];
}

export interface BackendRoute {
  type: 'direct' | 'connecting';
  totalDistanceKm: number;
  totalDurationMin: number;
  legs: BackendLeg[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Infer a rough TrainType from the train name / number. */
function inferTrainType(name: string, no: number): TrainType {
  const upper = (name ?? '').toUpperCase();
  if (upper.includes('RAJDHANI') || upper.includes('SHATABDI') || upper.includes('VANDE')) return 'Bullet';
  if (upper.includes('EXPRESS') || upper.includes('EXP') || upper.includes('SUPERFAST')) return 'Express';
  return 'Passenger';
}

/** Infer a rough speed (km/h) for display from the train type. */
function inferSpeed(type: TrainType): number {
  if (type === 'Bullet') return 160;
  if (type === 'Express') return 110;
  return 70;
}

/** Estimate a base price from distance (₹ per km approximation). */
function estimatePrice(distanceKm: number, type: TrainType): number {
  const rate = type === 'Bullet' ? 2.5 : type === 'Express' ? 1.8 : 1.2;
  return Math.round(distanceKm * rate);
}

function makeStation(name: string, code: string): Station {
  return {
    id:   code.toLowerCase(),
    code: code,
    name: name,
    city: name, // city data not separately stored in Neo4j
  };
}

function makeStop(
  station: Station,
  arrivalTime: string,
  departureTime: string,
  distanceOffsetKm: number,
  waitMins: number,
  platform: string,
): Stop {
  return { station, arrivalTime, departureTime, waitTimeMins: waitMins, distanceOffsetKm, platform };
}

// ── Main transformer ─────────────────────────────────────────────────────────

export function transformRoutes(backendRoutes: BackendRoute[]): Route[] {
  return backendRoutes.map((br, idx) => {
    const firstLeg = br.legs[0];
    const lastLeg  = br.legs[br.legs.length - 1];

    const source      = makeStation(firstLeg.fromStation, firstLeg.fromStationCode);
    const destination = makeStation(lastLeg.toStation,    lastLeg.toStationCode);

    const trainType  = inferTrainType(firstLeg.trainName, firstLeg.trainNo);
    const trainSpeed = inferSpeed(trainType);

    const train: Train = {
      id:       `train-${firstLeg.trainNo}`,
      name:     firstLeg.trainName ?? `Train ${firstLeg.trainNo}`,
      number:   String(firstLeg.trainNo),
      type:     trainType,
      speedKmh: trainSpeed,
    };

    // Build the legs array
    const legs: RouteLeg[] = br.legs.map(leg => {
      const legTrainType = inferTrainType(leg.trainName, leg.trainNo);
      const legTrainSpeed = inferSpeed(legTrainType);
      return {
        train: {
          id: `train-${leg.trainNo}`,
          name: leg.trainName ?? `Train ${leg.trainNo}`,
          number: String(leg.trainNo),
          type: legTrainType,
          speedKmh: legTrainSpeed,
        },
        fromStation: makeStation(leg.fromStation, leg.fromStationCode),
        toStation: makeStation(leg.toStation, leg.toStationCode),
        departureTime: leg.departureTime,
        arrivalTime: leg.arrivalTime,
        distanceKm: leg.distanceKm,
      };
    });

    // Build the stops array ------------------------------------------------
    const stops: Stop[] = [];

    // Source stop (origin of first leg)
    stops.push(makeStop(source, '--:--', firstLeg.departureTime, 0, 0, 'Platform 1'));

    // Walk through each leg
    let distanceSoFar = 0;
    br.legs.forEach((leg, legIdx) => {
      // Mid-stations within this leg
      (leg.midStations ?? []).forEach((midName, mIdx) => {
        // We only have station names, not codes — derive a pseudo-code
        const pseudoCode = midName
          .split(' ')
          .map(w => w[0])
          .join('')
          .toUpperCase()
          .slice(0, 4);
        const midStation = makeStation(midName, pseudoCode);
        const midDist = Math.round(
          distanceSoFar + (leg.distanceKm * ((mIdx + 1) / (leg.midStations.length + 1)))
        );
        stops.push(makeStop(midStation, '--:--', '--:--', midDist, 2, 'Platform 2'));
      });

      distanceSoFar += leg.distanceKm;

      // Transfer station between legs
      if (legIdx < br.legs.length - 1) {
        const nextLeg    = br.legs[legIdx + 1];
        const transferSt = makeStation(leg.toStation, leg.toStationCode);
        stops.push(
          makeStop(transferSt, leg.arrivalTime, nextLeg.departureTime, distanceSoFar, 0, 'Platform 3')
        );
      }
    });

    // Destination stop
    stops.push(
      makeStop(destination, lastLeg.arrivalTime, '--:--', Math.round(br.totalDistanceKm), 0, 'Platform 1')
    );

    return {
      id:               `route-${idx}-${source.code}-${destination.code}-${firstLeg.trainNo}`,
      train,
      source,
      destination,
      stops,
      legs,
      totalDurationMins: br.totalDurationMin,
      totalDistanceKm:   Math.round(br.totalDistanceKm),
      basePrice:         estimatePrice(br.totalDistanceKm, trainType),
      departureTime:     firstLeg.departureTime ?? '--:--',
      arrivalTime:       lastLeg.arrivalTime    ?? '--:--',
    };
  });
}
