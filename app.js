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
  const authHeader = request.headers["autherization"];
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
const convertObjecttoResponse = (dbObject) => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  };
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
//API 2
app.get("/states/", authenticateToken, async (request, response) => {
  const getDetailsQuery = `SELECT * FROM state;`;
  const detailsArray = await db.all(getDetailsQuery);
  console.log(detailsArray);
  response.send(
    detailsArray.map((eachObject) => {
      convertObjecttoResponse(eachObject);
    })
  );
});
module.exports = app;
