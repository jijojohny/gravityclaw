import winston from "winston";
import { isProduction } from "../config/index.js";

const format = isProduction
  ? winston.format.json()
  : winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: "HH:mm:ss" }),
      winston.format.printf(({ timestamp, level, message, ...rest }) => {
        const extra = Object.keys(rest).length ? JSON.stringify(rest, null, 2) : "";
        return `${timestamp} ${level}: ${message} ${extra}`;
      })
    );

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format,
  transports: [new winston.transports.Console()],
});
