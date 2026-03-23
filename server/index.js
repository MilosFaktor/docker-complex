const keys = require("./keys");
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { Pool } = require("pg");
const redis = require("redis");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const pgClient = new Pool({
  user: keys.pgUser,
  host: keys.pgHost,
  database: keys.pgDatabase,
  password: keys.pgPassword,
  port: keys.pgPort,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

pgClient.on("connect", (client) => {
  client
    .query("CREATE TABLE IF NOT EXISTS values (number INT)")
    .catch((err) => console.error("PG table create error:", err));
});

const redisClient = redis.createClient({
  socket: {
    host: keys.redisHost,
    port: Number(keys.redisPort),
    tls: true,
    reconnectStrategy: () => 1000,
  },
});

const redisPublisher = redisClient.duplicate();

redisClient.on("error", (err) => {
  console.error("Redis Client Error:", err);
});

redisPublisher.on("error", (err) => {
  console.error("Redis Publisher Error:", err);
});

app.get("/", (req, res) => {
  res.send("Hi");
});

app.get("/values/all", async (req, res) => {
  try {
    const values = await pgClient.query("SELECT * FROM values");
    res.send(values.rows);
  } catch (err) {
    console.error("GET /values/all error:", err);
    res.status(500).send({ error: "Failed to fetch all values" });
  }
});

app.get("/values/current", async (req, res) => {
  try {
    const values = await redisClient.hGetAll("values");
    res.send(values);
  } catch (err) {
    console.error("GET /values/current error:", err);
    res.status(500).send({ error: "Failed to fetch current values" });
  }
});

app.post("/values", async (req, res) => {
  try {
    const index = req.body.index;

    if (parseInt(index, 10) > 40) {
      return res.status(422).send("Index too high");
    }

    await redisClient.hSet("values", index, "Nothing yet!");
    await redisPublisher.publish("insert", index);
    await pgClient.query("INSERT INTO values(number) VALUES($1)", [index]);

    res.send({ working: true });
  } catch (err) {
    console.error("POST /values error:", err);
    res.status(500).send({ error: "Failed to process value" });
  }
});

async function start() {
  try {
    await redisClient.connect();
    await redisPublisher.connect();

    app.listen(5000, () => {
      console.log("Listening");
    });
  } catch (err) {
    console.error("Startup error:", err);
    process.exit(1);
  }
}

start();
