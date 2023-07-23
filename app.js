const express = require("express");
const app = express();
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const dbpath = path.join(__dirname, "covid19IndiaPortal.db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
app.use(express.json());
let db = null;

const intializeDbandServer = async () => {
  try {
    db = await open({
      filename: dbpath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`Db Error:'${e.message}'`);
    process.exit(1);
  }
};
intializeDbandServer();
const mySecretToken =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImNocmlzdG9waGVyX3BoaWxsaXBzIiwiaWF0IjoxNjkwMDA5OTE4fQ.aSRABmvktCwSSui4_NY45CLmnRY1wX7x5_1irPqx4zc";
const authenticateToken = (request, response, next) => {
  const authHeader = request.headers["authorization"];
  let jwtToken;
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, mySecretToken, async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
};
//login API
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const dbuser = await db.get(selectUserQuery);
  if (dbuser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbuser.password);
    if (isPasswordMatched === true) {
      const payload = {
        username: username,
      };
      let jwtToken = jwt.sign(payload, "mySecretToken");
      response.status(200);
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

const convertDbObjectToResponseObjectstate = (eachObject) => {
  return {
    stateId: eachObject.state_id,
    stateName: eachObject.state_name,
    population: eachObject.population,
  };
};
const convertDBObjectToresponseObjectDistrict = (dbObject) => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  };
};

//API 1
app.get("/states/", authenticateToken, async (request, response) => {
  const getDetailsQuery = `SELECT * FROM state;`;
  const detailsArray = await db.all(getDetailsQuery);
  response.send(
    detailsArray.map((eachObject) =>
      convertDbObjectToResponseObjectstate(eachObject)
    )
  );
});
//API 2
app.get("/states/:stateId/", authenticateToken, async (request, response) => {
  const { stateId } = request.params;
  const getstateQuery = `SELECT *
    FROM 
    state
    WHERE 
    state_id=${stateId};`;
  const stateDetails = await db.get(getstateQuery);
  response.send(convertDbObjectToResponseObjectstate(stateDetails));
});
// API 3
app.post("/districts/", authenticateToken, async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const postDistrictQuery = `INSERT INTO district(district_name, state_id, cases,cured, active,deaths) 
    VALUES ('${districtName}',${stateId},${cases},${cured},${active},${deaths});`;
  await db.run(postDistrictQuery);
  response.send("District Successfully Added");
});
//API 4
app.get(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    const getdistrictQuery = `SELECT * FROM district 
    WHERE district_id=${districtId};`;
    const districtDetails = await db.get(getdistrictQuery);
    response.send(convertDBObjectToresponseObjectDistrict(districtDetails));
  }
);
//API 5
app.delete(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    const deleteQuery = `DELETE FROM district
    WHERE district_id = ${districtId};`;
    await db.run(deleteQuery);
    response.send("District Removed");
  }
);
//API 6
app.put(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    const {
      districtName,
      stateId,
      cases,
      cured,
      active,
      deaths,
    } = request.body;
    const updateQuery = `UPDATE district 
    SET 
    district_name = '${districtName}',
    state_id = ${stateId},
    cases = ${cases},
    cured = ${cured},
    active = ${active},
    deaths = ${deaths} 
    WHERE 
    district_id= ${districtId};`;
    await db.run(updateQuery);
    response.send("District Details Updated");
  }
);
//API 7
app.get(
  "/states/:stateId/stats/",
  authenticateToken,
  async (request, response) => {
    const { stateId } = request.params;
    const getstatsOfStateQuery = `SELECT 
    SUM(cases),SUM(cured),SUM(active),SUM(deaths)
    FROM district 
    WHERE state_id = ${stateId};`;
    const stats = await db.get(getstatsOfStateQuery);
    response.send({
      totalCases: stats["SUM(cases)"],
      totalCured: stats["SUM(cured)"],
      totalActive: stats["SUM(active)"],
      totalDeaths: stats["SUM(deaths)"],
    });
  }
);
//API 8
app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const getdistrictIdQuery = `SELECT state_id FROM district
    WHERE district_id=${districtId};`;
  const getdistrictIdQueryResponse = await db.get(getdistrictIdQuery);
  const getstateQuery = `SELECT state_name AS stateName FROM state
     WHERE state_id =${getdistrictIdQueryResponse.state_id};`;
  const resultResponse = await db.get(getstateQuery);
  response.send(resultResponse);
});
module.exports = app;
