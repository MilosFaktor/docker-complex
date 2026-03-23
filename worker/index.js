const keys = require("./keys");
const redis = require("redis");

const redisClient = redis.createClient({
  socket: {
    host: keys.redisHost,
    port: Number(keys.redisPort),
    tls: true,
    reconnectStrategy: () => 1000,
  },
});

const sub = redisClient.duplicate();

redisClient.on("error", (err) => {
  console.error("Worker redisClient error:", err);
});

sub.on("error", (err) => {
  console.error("Worker sub error:", err);
});

function fib(index) {
  if (index < 2) return 1;
  return fib(index - 1) + fib(index - 2);
}

async function start() {
  try {
    await redisClient.connect();
    await sub.connect();

    console.log("Worker connected to Redis");

    await sub.subscribe("insert", async (message) => {
      const result = fib(parseInt(message, 10));
      await redisClient.hSet("values", message, result.toString());
      console.log(`Stored fib(${message}) = ${result}`);
    });
  } catch (err) {
    console.error("Worker startup error:", err);
    process.exit(1);
  }
}

start();
