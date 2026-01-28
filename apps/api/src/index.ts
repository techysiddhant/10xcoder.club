import cluster from "node:cluster";
import os from "node:os";
import process from "node:process";

/**
 * Production entrypoint (used for compiling to a single binary).
 * Cluster-mode pattern: https://elysiajs.com/patterns/deploy.html
 */
if (cluster.isPrimary) {
  for (let i = 0; i < os.availableParallelism(); i++) cluster.fork();
} else {
  await import("./server");
  console.log(`Worker ${process.pid} started`);
}
