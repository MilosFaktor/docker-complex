const keys = require("./keys");
const redis = require("redis");

const redisClient = redis.createClient({
  socket: {
    host: keys.redisHost,
    port: Number(keys.redisPort),
    tls: process.env.NODE_ENV === "production",
    reconnectStrategy: () => 1000,
  },
});

const sub = redisClient.duplicate();

redisClient.on("error", (err) => {
  console.error("Redis Client Error", err);
});

sub.on("error", (err) => {
  console.error("Redis Sub Error", err);
});

function fib(index) {
  if (index < 2) return 1;
  return fib(index - 1) + fib(index - 2);
}

(async () => {
  await redisClient.connect();
  await sub.connect();

  await sub.subscribe("insert", async (message) => {
    await redisClient.hSet("values", message, fib(parseInt(message)));
  });
})();
