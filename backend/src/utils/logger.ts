import winston from "winston";
import path from "path";
import { fileURLToPath } from "url";
import { mkdirSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logsDir = path.join(__dirname, "../../logs");
mkdirSync(logsDir, { recursive: true });

//log levels
const levels = {error: 0,warn: 1, info: 2,http: 3,debug: 4,};
//log colors
const colors = {error: "red",warn: "yellow",info: "green",http: "magenta",debug: "white",};
winston.addColors(colors);

const level = () => {
  const env = process.env.NODE_ENV || "development";
  const isDevelopment = env === "development";
  return isDevelopment ? "debug" : "warn";
};
//log format
const format = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    let metaString = "";
    if (Object.keys(meta).length > 0 && meta.stack) {
      metaString = `\n${meta.stack}`;
    } else if (Object.keys(meta).length > 0) {
      metaString = ` ${JSON.stringify(meta)}`;
    }
    return `${timestamp} [${level}]: ${message}${metaString}`;
  })
);
//transports
const transports = [
  new winston.transports.Console({
    format: format,
  }),
  new winston.transports.File({
    filename: path.join(logsDir, "error.log"),
    level: "error",
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
  }),
  new winston.transports.File({
    filename: path.join(logsDir, "combined.log"),
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
  }),
];

//logger
const logger = winston.createLogger({
  level: level(),levels,format,transports,
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, "exceptions.log"),
    }),
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, "rejections.log"),
    }),
  ],
});
export default logger;

