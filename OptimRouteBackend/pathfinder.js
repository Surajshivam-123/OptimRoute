import { runQuery } from './auradb.js';
import { directCypher, twoHopCypher, threeHopCypher, cypherQuery, allStationcypher } from './query.js';
function parseNeo4jInt(val) {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'object' && 'low' in val) {
    return val.low;
  }
  return Number(val);
}

function timeDifferenceMin(start, end) {
  if (!start || !end) return 0;
  const cleanStart = start.trim();
  const cleanEnd = end.trim();

  const [h1, m1] = cleanStart.split(':').map(Number);
  const [h2, m2] = cleanEnd.split(':').map(Number);

  if (isNaN(h1) || isNaN(m1) || isNaN(h2) || isNaN(m2)) return 0;

  let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
  if (diff < 0) diff += 24 * 60;
  return diff;
}

function calculateRouteDurationMin(depTimes, arrTimes) {
  let totalMin = 0;
  if (!depTimes || !arrTimes || depTimes.length === 0) return 0;
  for (let i = 0; i < depTimes.length; i++) {
    totalMin += timeDifferenceMin(depTimes[i], arrTimes[i]);
    if (i < depTimes.length - 1) {
      totalMin += timeDifferenceMin(arrTimes[i], depTimes[i + 1]);
    }
  }
  return totalMin;
}
const allStation = async (req, res) => {
  try {
    const q = (req.query.q || '').trim().toUpperCase();
    const records = await runQuery(allStationcypher, q ? { q } : {});
    const stations = records.map(r => ({
      id: r.get('code').toLowerCase(),
      code: r.get('code'),
      name: r.get('name'),
      city: r.get('name'),
    }));
    res.json({ success: true, stations });
  } catch (err) {
    console.error('Failed to fetch stations:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}
const findTwoHopRoutes = async function (req, res) {
  const { origin, destination } = req.query;
  const maxChanges = parseInt(req.query.maxChanges || req.query.max_changes || req.query.changes || '2', 10);

  if (!origin || !destination) {
    return res.status(400).json({
      success: false,
      error: "Missing parameters. Please provide both 'origin' and 'destination' station codes."
    });
  }

  const originCode = origin.toUpperCase();
  const destinationCode = destination.toUpperCase();

  try {
    const allRoutes = [];

    // 1. Fetch Direct Routes (0 changes)
    if (maxChanges >= 0) {
      const directRecords = await runQuery(directCypher, { origin: originCode, destination: destinationCode });

      directRecords.forEach(record => {
        const depTimes = record.get('DepTimes') || [];
        const arrTimes = record.get('ArrTimes') || [];
        const durationMin = calculateRouteDurationMin(depTimes, arrTimes);

        allRoutes.push({
          type: "direct",
          totalDistanceKm: parseFloat(record.get('TotalDistanceKm')) || 0,
          totalDurationMin: durationMin,
          legs: [
            {
              trainNo: parseNeo4jInt(record.get('TrainNo')),
              trainName: record.get('TrainName'),
              fromStation: record.get('Origin'),
              fromStationCode: record.get('OriginCode'),
              departureTime: record.get('Departs'),
              toStation: record.get('Destination'),
              toStationCode: record.get('DestinationCode'),
              arrivalTime: record.get('Arrives'),
              distanceKm: parseFloat(record.get('TotalDistanceKm')) || 0,
              midStations: record.get('MidStations')
            }
          ]
        });
      });
    }

    // 2. Fetch 2-Hop Routes (1 change)
    if (maxChanges >= 1) {
      const twoHopRecords = await runQuery(twoHopCypher, { origin: originCode, destination: destinationCode });

      twoHopRecords.forEach(record => {
        const t1DepTimes = record.get('T1DepTimes') || [];
        const t1ArrTimes = record.get('T1ArrTimes') || [];
        const t2DepTimes = record.get('T2DepTimes') || [];
        const t2ArrTimes = record.get('T2ArrTimes') || [];

        const t1Duration = calculateRouteDurationMin(t1DepTimes, t1ArrTimes);
        const t2Duration = calculateRouteDurationMin(t2DepTimes, t2ArrTimes);

        const t1Arr = record.get('T1Arr');
        const t2Dep = record.get('T2Dep');
        const layover = timeDifferenceMin(t1Arr, t2Dep);

        const totalDurationMin = t1Duration + layover + t2Duration;
        const t1Dist = parseFloat(record.get('T1Distance')) || 0;
        const t2Dist = parseFloat(record.get('T2Distance')) || 0;

        allRoutes.push({
          type: "connecting",
          totalDistanceKm: t1Dist + t2Dist,
          totalDurationMin: totalDurationMin,
          legs: [
            {
              trainNo: parseNeo4jInt(record.get('T1No')),
              trainName: record.get('T1Name'),
              fromStation: record.get('T1Origin'),
              fromStationCode: record.get('T1OriginCode'),
              departureTime: record.get('T1Dep'),
              toStation: record.get('TransferStation'),
              toStationCode: record.get('TransferCode'),
              arrivalTime: record.get('T1Arr'),
              distanceKm: t1Dist,
              midStations: record.get('T1MidStations')
            },
            {
              trainNo: parseNeo4jInt(record.get('T2No')),
              trainName: record.get('T2Name'),
              fromStation: record.get('TransferStation'),
              fromStationCode: record.get('TransferCode'),
              departureTime: record.get('T2Dep'),
              toStation: record.get('T2Destination'),
              toStationCode: record.get('T2DestinationCode'),
              arrivalTime: record.get('T2Arr'),
              distanceKm: t2Dist,
              midStations: record.get('T2MidStations')
            }
          ]
        });
      });
    }

    // 3. Fetch 3-Hop Routes (2 changes)
    if (maxChanges >= 2) {
      const threeHopRecords = await runQuery(threeHopCypher, { origin: originCode, destination: destinationCode });

      threeHopRecords.forEach(record => {
        const t1DepTimes = record.get('T1DepTimes') || [];
        const t1ArrTimes = record.get('T1ArrTimes') || [];
        const t2DepTimes = record.get('T2DepTimes') || [];
        const t2ArrTimes = record.get('T2ArrTimes') || [];
        const t3DepTimes = record.get('T3DepTimes') || [];
        const t3ArrTimes = record.get('T3ArrTimes') || [];

        const t1Duration = calculateRouteDurationMin(t1DepTimes, t1ArrTimes);
        const t2Duration = calculateRouteDurationMin(t2DepTimes, t2ArrTimes);
        const t3Duration = calculateRouteDurationMin(t3DepTimes, t3ArrTimes);

        const t1Arr = record.get('T1Arr');
        const t2Dep = record.get('T2Dep');
        const t2Arr = record.get('T2Arr');
        const t3Dep = record.get('T3Dep');

        const layover1 = timeDifferenceMin(t1Arr, t2Dep);
        const layover2 = timeDifferenceMin(t2Arr, t3Dep);

        const totalDurationMin = t1Duration + layover1 + t2Duration + layover2 + t3Duration;
        const t1Dist = parseFloat(record.get('T1Distance')) || 0;
        const t2Dist = parseFloat(record.get('T2Distance')) || 0;
        const t3Dist = parseFloat(record.get('T3Distance')) || 0;

        allRoutes.push({
          type: "connecting",
          totalDistanceKm: t1Dist + t2Dist + t3Dist,
          totalDurationMin: totalDurationMin,
          legs: [
            {
              trainNo: parseNeo4jInt(record.get('T1No')),
              trainName: record.get('T1Name'),
              fromStation: record.get('T1Origin'),
              fromStationCode: record.get('T1OriginCode'),
              departureTime: record.get('T1Dep'),
              toStation: record.get('TransferStation1'),
              toStationCode: record.get('TransferCode1'),
              arrivalTime: record.get('T1Arr'),
              distanceKm: t1Dist,
              midStations: record.get('T1MidStations')
            },
            {
              trainNo: parseNeo4jInt(record.get('T2No')),
              trainName: record.get('T2Name'),
              fromStation: record.get('TransferStation1'),
              fromStationCode: record.get('TransferCode1'),
              departureTime: record.get('T2Dep'),
              toStation: record.get('TransferStation2'),
              toStationCode: record.get('TransferCode2'),
              arrivalTime: record.get('T2Arr'),
              distanceKm: t2Dist,
              midStations: record.get('T2MidStations')
            },
            {
              trainNo: parseNeo4jInt(record.get('T3No')),
              trainName: record.get('T3Name'),
              fromStation: record.get('TransferStation2'),
              fromStationCode: record.get('TransferCode2'),
              departureTime: record.get('T3Dep'),
              toStation: record.get('T3Destination'),
              toStationCode: record.get('T3DestinationCode'),
              arrivalTime: record.get('T3Arr'),
              distanceKm: t3Dist,
              midStations: record.get('T3MidStations')
            }
          ]
        });
      });
    }

    // Sort all gathered routes by total travel duration ascending
    allRoutes.sort((a, b) => a.totalDurationMin - b.totalDurationMin);

    // Limit to top 15 results
    const topRoutes = allRoutes.slice(0, 15);

    res.status(200).json({
      success: true,
      count: topRoutes.length,
      routes: topRoutes
    });

  } catch (error) {
    console.error("Failed to execute route search algorithm:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

const findDirectRoute = async function (req, res) {
  const { origin, destination } = req.query;

  if (!origin || !destination) {
    return res.status(400).json({ error: "Please provide both origin and destination parameters." });
  }

  const originCode = origin.toUpperCase();
  const destinationCode = destination.toUpperCase();



  try {
    const records = await runQuery(cypherQuery, {
      origin: originCode,
      destination: destinationCode
    });

    const directRoutes = records.map(record => {
      const depTimes = record.get('DepTimes') || [];
      const arrTimes = record.get('ArrTimes') || [];
      const durationMin = calculateRouteDurationMin(depTimes, arrTimes);

      return {
        trainNo: parseNeo4jInt(record.get('TrainNo')),
        trainName: record.get('TrainName'),
        origin: record.get('Origin'),
        originCode: record.get('OriginCode'),
        departureTime: record.get('Departs'),
        destination: record.get('Destination'),
        destinationCode: record.get('DestinationCode'),
        arrivalTime: record.get('Arrives'),
        totalDistanceKm: parseFloat(record.get('TotalDistanceKm')) || 0,
        totalDurationMin: durationMin,
        intermediateStopsCount: record.get('MidStations').length,
        midStations: record.get('MidStations')
      };
    });

    res.status(200).json({
      success: true,
      count: directRoutes.length,
      routes: directRoutes
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
};



export { findDirectRoute, findTwoHopRoutes, allStation };