import { sendCriticalAlert } from "./lib/criticalAlert";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    process.on("unhandledRejection", (reason) => {
      const msg = reason instanceof Error
        ? (reason.stack || reason.message)
        : String(reason);
      sendCriticalAlert("Unhandled Promise Rejection", msg).catch(console.error);
    });

    process.on("uncaughtException", (error) => {
      const msg = error.stack || error.message;
      sendCriticalAlert("Uncaught Exception", msg).catch(console.error);
    });
  }
}
