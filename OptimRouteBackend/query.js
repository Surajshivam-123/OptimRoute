export const directCypher = `
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


export const twoHopCypher = `
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

export const threeHopCypher = `
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
export const cypherQuery = `
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

const allStationcypher = q
    ? `MATCH (s:Station)
         WHERE toUpper(s.name) CONTAINS $q OR toUpper(s.code) CONTAINS $q
         RETURN s.code AS code, s.name AS name
         ORDER BY s.name
         LIMIT 20`
    : `MATCH (s:Station) RETURN s.code AS code, s.name AS name ORDER BY s.name`;