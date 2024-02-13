const express = require('express')
const path = require('path')

const {open} = require('sqlite')
const sqlite3 = require('sqlite3')

const app = express()
app.use(express.json())

const dbpath = path.join(__dirname, 'covid19India.db')

let db = null

const initilazeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbpath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server is running at http://localhost:3000')
    })
  } catch (e) {
    console.log(`DB Error: ${e.message}`)
    process.exit(1)
  }
}

initilazeDbAndServer()

const convetStateToResponseObj = dbObj => {
  return {
    stateId: dbObj.state_id,
    stateName: dbObj.state_name,
    population: dbObj.population,
  }
}

const snakeCaseToCamelCase = newObj => {
  return {
    totalCases: newObj.cases,
    totalCured: newObj.cured,
    totalActive: newObj.active,
    totalDeaths: newObj.deaths,
  }
}

// Returns a list of all states in the state table

app.get('/states/', async (request, response) => {
  const getAllStates = `
    SELECT 
      *
    FROM
      state
    `
  const allStates = await db.all(getAllStates)
  response.send(allStates.map(dbObj => convetStateToResponseObj(dbObj)))
})

// Returns a state based on the state ID

app.get('/states/:stateId/', async (request, response) => {
  const {stateId} = request.params
  const getSatateId = `
  SELECT
    *
  FROM
    state
  WHERE
    state_id = ${stateId};
  `
  const getSingleState = await db.get(getSatateId)
  response.send(convetStateToResponseObj(getSingleState))
})

// Create a district in the district table

app.post('/districts/', async (request, response) => {
  const {districtName, stateId, cases, cured, active, deaths} = request.body
  const createState = `
  INSERT INTO 
    district (district_name, state_id, cases, cured, active, deaths)
  VALUES (
    "${districtName}",
    ${stateId},
    ${cases},
    ${cured},
    ${active},
    ${deaths}
  );
  `
  await db.run(createState)
  response.send('District Successfully Added')
})

const convetDistrictToResponseObj = objDb => {
  return {
    districtId: objDb.district_id,
    districtName: objDb.district_name,
    stateId: objDb.state_id,
    cases: objDb.cases,
    cured: objDb.cured,
    active: objDb.active,
    deaths: objDb.deaths,
  }
}
// Returns a district based on the district ID

app.get('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const getDistrictId = `
  SELECT
    *
  FROM
    district
  WHERE
    district_id = ${districtId};
  `
  const districtQuery = await db.get(getDistrictId)
  response.send(convetDistrictToResponseObj(districtQuery))
})

// Deletes a district from the district table based on the district ID

app.delete('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const districtDeleteQuery = `
  DELETE FROM 
    district
  WHERE
    district_id = ${districtId};
  `
  await db.run(districtDeleteQuery)
  response.send('District Removed')
})

// Updates the details of a specific district based on the district ID

app.put('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const {districtName, stateId, cases, cured, active, deaths} = request.body
  const updateDistrictQuery = `
  UPDATE
    district 
  SET 
    district_name = "${districtName}",
    state_id = ${stateId},
    cases = ${cases},
    cured = ${cured},
    active = ${active},
    deaths = ${deaths}
  WHERE
    district_id = ${districtId};
  `
  await db.run(updateDistrictQuery)
  response.send('District Details Updated')
})

// Returns the statistics of total cases, cured, active, deaths of a specific state based on state ID

app.get('/states/:stateId/stats/', async (request, response) => {
  const {stateId} = request.params
  const getStateReport = `
  SELECT
    SUM(cases) AS cases,
    SUM(cured) As cured,
    SUM(active) AS active,
    SUM(deaths) AS deaths
  FROM 
    district
  WHERE
    state_id = ${stateId};
  `
  const stateReport = await db.get(getStateReport)
  const results = snakeCaseToCamelCase(stateReport)
  response.send(results)
})

app.get('/districts/:districtId/details/', async (request, response) => {
  const {districtId} = request.params
  const stateDetails = `
  SELECT
    state_name
  FROM
    state JOIN district ON state.state_id = district.state_id
  WHERE district.district_id = ${districtId};
  `
  const stateNames = await db.get(stateDetails)
  response.send({stateName: stateNames.state_name})
})

module.exports = app
