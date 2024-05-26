const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const cors = require("cors");

const jwt = require("jsonwebtoken");
const uuid = require("uuid");
const bcrypt = require("bcrypt");

const uuidv4 = uuid.v4;

const app = express();
app.use(express.json());
app.use(cors());

const dbPath = path.join(__dirname, "users.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3001, () => {
      console.log("Server Running at Port localhost:3001");
      //   console.log(uuidv4());
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

// Get ALL Users API

app.get("/users", async (req, res) => {
  const sql = `SELECT * FROM users`;
  const data = await db.all(sql);
  // const list = data.json();
  res.send(data);
});


//Login API
app.post("/users/login", async (req, res) => {
  const { username, password } = req.body;

  // SQL query to select the user by username
  const sql = `SELECT * FROM users WHERE username = ?`;
  try {
    // Execute the query with the provided username
    const dbData = await db.get(sql, [username]);
    
    // Check if the user exists
    if (dbData === undefined) {
      res.status(400).json({
        err_msg: "Invalid User or User Not Registered",
      });
    } else {
      // Compare the provided password with the stored hashed password
      const matchPassword = await bcrypt.compare(password, dbData.password);
      
      // If the password matches, generate a JWT token
      if (matchPassword) {
        const payload = { username: username };
        const jwtToken = jwt.sign(payload, "My_Token");
        
        // Send the JWT token and success message in the response
        res.status(200).json({
          jwt_token: jwtToken,
          message: "User logged in successfully",
        });
      } else {
        // If the password does not match, send an error message
        res.status(400).json({ err_msg: "Invalid Password!!" });
      }
    }
  } catch (error) {
    // Handle any database or server errors
    res.status(500).json({ err_msg: "Internal Server Error" });
  }
});

// Post Users SignUp API
app.post("/users/signup", async (request, response) => {
  const userDetails = request.body;
  const { username, password } = userDetails;
  const setPassword = await bcrypt.hash(password, 10);
  const id = uuidv4();

  if (username === "" || password === "") {
    response.status(400);
    response.send({
      err_msg: "Please enter valid ussername & password",
    });
  } else {
    const sql = `SELECT * FROM users WHERE username = '${username}'`;
    const dbData = await db.get(sql);

    if (dbData === undefined) {
      const postUserQuery = `
        INSERT INTO
          users (id, username, password)
        VALUES
          ('${id}', '${username}', '${setPassword}');`;
      const data = await db.run(postUserQuery);
      if (data) {
        response.status(200);
        response.send({ data, success: "User Created Successfully" });
      } else {
        response.status(404);
        response.send({
          err_msg: "Something went wrong, Please try again later",
        });
      }
    } else {
      response.status(400);
      response.send({
        err_msg: "This usrname already exists",
      });
    }
  }
});

// Delete User API
app.delete("/users/delete/:id", async (request, response) => {
  const { id } = request.params;
  const deleteuserQuery = `
    DELETE FROM
      users
    WHERE
      id='${id}';`;
  await db.all(deleteuserQuery);
  response.send("User Deleted");
});
