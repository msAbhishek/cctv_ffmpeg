/**
 * @author [Abhishek m s]
 * @email [abhishek.m54@thinkpalm.com]
 * @create date 2018-10-30 09:27:32
 * @modify date 2018-10-30 09:27:32
 * @desc [description]
*/
const winston = require("winston");
require("winston-daily-rotate-file");
let logDir = "./log/";
const dailyRotateFileTransport = new winston.transports.DailyRotateFile({
    filename: `${logDir}/%DATE%-cctvLog.log`,
    tailable: true,
    datePattern: "YYYY-MM-DD",
    maxFiles:5
});
const logger = winston.createLogger({
    transports: [
        new winston.transports.Console(),
        dailyRotateFileTransport
    ]
});
module.exports = logger;