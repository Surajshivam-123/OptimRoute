import { runQuery } from './auradb.js';

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

const findTwoHopRoutes = async function(req, res) {
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
      const directCypher = `
        MATCH (start:Station {code: $origin})-[:LEAVES_FROM]->(legStart:TrainLeg)
        MATCH (legEnd:TrainLeg)-[:ARRIVES_AT]->(end:Station {code: $destination})
        WHERE legStart.trainNo = legEnd.trainNo        
          AND legStart.seq <= legEnd.seq
          AND legStart.source = legEnd.source
          AND legStart.destination = legEnd.destination

        OPTIONAL MATCH (midLeg:TrainLeg {trainNo: legStart.trainNo})
        WHERE midLeg.seq >= legStart.seq 
          AND midLeg.seq <= legEnd.seq
          AND midLeg.source = legStart.source
          AND midLeg.destination = legStart.destination
        WITH start, end, legStart, legEnd, midLeg
        ORDER BY midLeg.seq ASC

        MATCH (midLeg)-[:ARRIVES_AT]->(stop:Station)

        WITH start, end, legStart, legEnd, 
             collect(CASE WHEN midLeg.seq < legEnd.seq THEN stop.name END) AS midStations,
             collect(midLeg.departureTime) AS depTimes,
             collect(midLeg.arrivalTime) AS arrTimes,
             sum(toFloat(midLeg.distance)) AS totalDistance

        RETURN 
          start.code AS OriginCode,
          start.name AS Origin,
          legStart.trainNo AS TrainNo,
          legStart.trainName AS TrainName,
          legStart.departureTime AS Departs,
          legEnd.arrivalTime AS Arrives,
          [x IN midStations WHERE x IS NOT NULL] AS MidStations,
          depTimes AS DepTimes,
          arrTimes AS ArrTimes,
          totalDistance AS TotalDistanceKm,
          end.code AS DestinationCode,
          end.name AS Destination
      `;

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
      const twoHopCypher = `
        MATCH (start:Station {code: $origin})-[:LEAVES_FROM]->(legStart1:TrainLeg)
        MATCH (legEnd1:TrainLeg)-[:ARRIVES_AT]->(transfer:Station)
        WHERE legStart1.trainNo = legEnd1.trainNo 
          AND legStart1.seq <= legEnd1.seq
          AND legStart1.source = legEnd1.source
          AND legStart1.destination = legEnd1.destination

        MATCH (transfer)-[:LEAVES_FROM]->(legStart2:TrainLeg)
        MATCH (legEnd2:TrainLeg)-[:ARRIVES_AT]->(end:Station {code: $destination})
        WHERE legStart2.trainNo = legEnd2.trainNo 
          AND legStart2.seq <= legEnd2.seq
          AND legStart2.source = legEnd2.source
          AND legStart2.destination = legEnd2.destination
          AND legStart2.trainNo <> legStart1.trainNo
          AND legStart2.departureTime > legEnd1.arrivalTime

        CALL {
          WITH legStart1, legEnd1
          OPTIONAL MATCH (midLeg1:TrainLeg {trainNo: legStart1.trainNo})
          WHERE midLeg1.seq >= legStart1.seq 
            AND midLeg1.seq <= legEnd1.seq
            AND midLeg1.source = legStart1.source
            AND midLeg1.destination = legStart1.destination
          WITH midLeg1, legEnd1
          ORDER BY midLeg1.seq ASC
          MATCH (midLeg1)-[:ARRIVES_AT]->(stop1:Station)
          RETURN 
            collect(CASE WHEN midLeg1.seq < legEnd1.seq THEN stop1.name END) AS T1MidStations,
            collect(midLeg1.departureTime) AS T1DepTimes,
            collect(midLeg1.arrivalTime) AS T1ArrTimes,
            sum(toFloat(midLeg1.distance)) AS T1Distance
        }

        CALL {
          WITH legStart2, legEnd2
          OPTIONAL MATCH (midLeg2:TrainLeg {trainNo: legStart2.trainNo})
          WHERE midLeg2.seq >= legStart2.seq 
            AND midLeg2.seq <= legEnd2.seq
            AND midLeg2.source = legStart2.source
            AND midLeg2.destination = legStart2.destination
          WITH midLeg2, legEnd2
          ORDER BY midLeg2.seq ASC
          MATCH (midLeg2)-[:ARRIVES_AT]->(stop2:Station)
          RETURN 
            collect(CASE WHEN midLeg2.seq < legEnd2.seq THEN stop2.name END) AS T2MidStations,
            collect(midLeg2.departureTime) AS T2DepTimes,
            collect(midLeg2.arrivalTime) AS T2ArrTimes,
            sum(toFloat(midLeg2.distance)) AS T2Distance
        }

        RETURN 
          legStart1.trainNo AS T1No,
          legStart1.trainName AS T1Name,
          start.name AS T1Origin,
          start.code AS T1OriginCode,
          legStart1.departureTime AS T1Dep,
          transfer.name AS TransferStation,
          transfer.code AS TransferCode,
          legEnd1.arrivalTime AS T1Arr,
          [x IN T1MidStations WHERE x IS NOT NULL] AS T1MidStations,
          T1DepTimes,
          T1ArrTimes,
          T1Distance,

          legStart2.trainNo AS T2No,
          legStart2.trainName AS T2Name,
          legStart2.departureTime AS T2Dep,
          end.name AS T2Destination,
          end.code AS T2DestinationCode,
          legEnd2.arrivalTime AS T2Arr,
          [x IN T2MidStations WHERE x IS NOT NULL] AS T2MidStations,
          T2DepTimes,
          T2ArrTimes,
          T2Distance
      `;

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
      const threeHopCypher = `
        MATCH (start:Station {code: $origin})-[:LEAVES_FROM]->(legStart1:TrainLeg)
        MATCH (legEnd1:TrainLeg)-[:ARRIVES_AT]->(transfer1:Station)
        WHERE legStart1.trainNo = legEnd1.trainNo 
          AND legStart1.seq <= legEnd1.seq
          AND legStart1.source = legEnd1.source
          AND legStart1.destination = legEnd1.destination

        MATCH (transfer1)-[:LEAVES_FROM]->(legStart2:TrainLeg)
        MATCH (legEnd2:TrainLeg)-[:ARRIVES_AT]->(transfer2:Station)
        WHERE legStart2.trainNo = legEnd2.trainNo 
          AND legStart2.seq <= legEnd2.seq
          AND legStart2.source = legEnd2.source
          AND legStart2.destination = legEnd2.destination
          AND legStart2.trainNo <> legStart1.trainNo
          AND legStart2.departureTime > legEnd1.arrivalTime

        MATCH (transfer2)-[:LEAVES_FROM]->(legStart3:TrainLeg)
        MATCH (legEnd3:TrainLeg)-[:ARRIVES_AT]->(end:Station {code: $destination})
        WHERE legStart3.trainNo = legEnd3.trainNo 
          AND legStart3.seq <= legEnd3.seq
          AND legStart3.source = legEnd3.source
          AND legStart3.destination = legEnd3.destination
          AND legStart3.trainNo <> legStart2.trainNo
          AND legStart3.trainNo <> legStart1.trainNo
          AND legStart3.departureTime > legEnd2.arrivalTime

        CALL {
          WITH legStart1, legEnd1
          OPTIONAL MATCH (midLeg1:TrainLeg {trainNo: legStart1.trainNo})
          WHERE midLeg1.seq >= legStart1.seq 
            AND midLeg1.seq <= legEnd1.seq
            AND midLeg1.source = legStart1.source
            AND midLeg1.destination = legStart1.destination
          WITH midLeg1, legEnd1
          ORDER BY midLeg1.seq ASC
          MATCH (midLeg1)-[:ARRIVES_AT]->(stop1:Station)
          RETURN 
            collect(CASE WHEN midLeg1.seq < legEnd1.seq THEN stop1.name END) AS T1MidStations,
            collect(midLeg1.departureTime) AS T1DepTimes,
            collect(midLeg1.arrivalTime) AS T1ArrTimes,
            sum(toFloat(midLeg1.distance)) AS T1Distance
        }

        CALL {
          WITH legStart2, legEnd2
          OPTIONAL MATCH (midLeg2:TrainLeg {trainNo: legStart2.trainNo})
          WHERE midLeg2.seq >= legStart2.seq 
            AND midLeg2.seq <= legEnd2.seq
            AND midLeg2.source = legStart2.source
            AND midLeg2.destination = legStart2.destination
          WITH midLeg2, legEnd2
          ORDER BY midLeg2.seq ASC
          MATCH (midLeg2)-[:ARRIVES_AT]->(stop2:Station)
          RETURN 
            collect(CASE WHEN midLeg2.seq < legEnd2.seq THEN stop2.name END) AS T2MidStations,
            collect(midLeg2.departureTime) AS T2DepTimes,
            collect(midLeg2.arrivalTime) AS T2ArrTimes,
            sum(toFloat(midLeg2.distance)) AS T2Distance
        }

        CALL {
          WITH legStart3, legEnd3
          OPTIONAL MATCH (midLeg3:TrainLeg {trainNo: legStart3.trainNo})
          WHERE midLeg3.seq >= legStart3.seq 
            AND midLeg3.seq <= legEnd3.seq
            AND midLeg3.source = legStart3.source
            AND midLeg3.destination = legStart3.destination
          WITH midLeg3, legEnd3
          ORDER BY midLeg3.seq ASC
          MATCH (midLeg3)-[:ARRIVES_AT]->(stop3:Station)
          RETURN 
            collect(CASE WHEN midLeg3.seq < legEnd3.seq THEN stop3.name END) AS T3MidStations,
            collect(midLeg3.departureTime) AS T3DepTimes,
            collect(midLeg3.arrivalTime) AS T3ArrTimes,
            sum(toFloat(midLeg3.distance)) AS T3Distance
        }

        RETURN 
          legStart1.trainNo AS T1No,
          legStart1.trainName AS T1Name,
          start.name AS T1Origin,
          start.code AS T1OriginCode,
          legStart1.departureTime AS T1Dep,
          transfer1.name AS TransferStation1,
          transfer1.code AS TransferCode1,
          legEnd1.arrivalTime AS T1Arr,
          [x IN T1MidStations WHERE x IS NOT NULL] AS T1MidStations,
          T1DepTimes,
          T1ArrTimes,
          T1Distance,

          legStart2.trainNo AS T2No,
          legStart2.trainName AS T2Name,
          legStart2.departureTime AS T2Dep,
          transfer2.name AS TransferStation2,
          transfer2.code AS TransferCode2,
          legEnd2.arrivalTime AS T2Arr,
          [x IN T2MidStations WHERE x IS NOT NULL] AS T2MidStations,
          T2DepTimes,
          T2ArrTimes,
          T2Distance,

          legStart3.trainNo AS T3No,
          legStart3.trainName AS T3Name,
          legStart3.departureTime AS T3Dep,
          end.name AS T3Destination,
          end.code AS T3DestinationCode,
          legEnd3.arrivalTime AS T3Arr,
          [x IN T3MidStations WHERE x IS NOT NULL] AS T3MidStations,
          T3DepTimes,
          T3ArrTimes,
          T3Distance
      `;

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

const findDirectRoute = async function(req, res) {
  const { origin, destination } = req.query;

  if (!origin || !destination) {
    return res.status(400).json({ error: "Please provide both origin and destination parameters." });
  }

  const originCode = origin.toUpperCase();
  const destinationCode = destination.toUpperCase();

  const cypherQuery = `
    MATCH (start:Station {code: $origin})-[:LEAVES_FROM]->(legStart:TrainLeg)
    MATCH (legEnd:TrainLeg)-[:ARRIVES_AT]->(end:Station {code: $destination})
    WHERE legStart.trainNo = legEnd.trainNo 
      AND legStart.seq <= legEnd.seq
      AND legStart.source = legEnd.source
      AND legStart.destination = legEnd.destination

    OPTIONAL MATCH (midLeg:TrainLeg {trainNo: legStart.trainNo})
    WHERE midLeg.seq >= legStart.seq 
      AND midLeg.seq <= legEnd.seq
      AND midLeg.source = legStart.source
      AND midLeg.destination = legStart.destination
    WITH start, end, legStart, legEnd, midLeg
    ORDER BY midLeg.seq ASC

    MATCH (midLeg)-[:ARRIVES_AT]->(stop:Station)

    WITH start, end, legStart, legEnd,
         collect(CASE WHEN midLeg.seq < legEnd.seq THEN stop.name END) AS midStations,
         collect(midLeg.departureTime) AS depTimes,
         collect(midLeg.arrivalTime) AS arrTimes,
         sum(toFloat(midLeg.distance)) AS totalDistance

    RETURN
      start.code AS OriginCode,
      start.name AS Origin,
      legStart.trainNo AS TrainNo,
      legStart.trainName AS TrainName,
      legStart.departureTime AS Departs,
      legEnd.arrivalTime AS Arrives,
      [x IN midStations WHERE x IS NOT NULL] AS MidStations,
      depTimes AS DepTimes,
      arrTimes AS ArrTimes,
      totalDistance AS TotalDistanceKm,
      end.code AS DestinationCode,
      end.name AS Destination
  `;

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

export { findDirectRoute, findTwoHopRoutes };