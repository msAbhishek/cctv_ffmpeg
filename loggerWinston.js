/**
 * @author [Abhishek m s]
 * @email [abhishek.m54@thinkpalm.com]
 * @create date 2018-10-30 09:27:32
 * @modify date 2018-10-30 09:27:32
 * @desc [description]
*/
const winston = require("winston");
const logger = winston.createLogger({
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: "./log/ffmpegLog.log" })
    ]
});
module.exports = logger;