/**
 * @author [Abhishek m s]
 * @email [abhishek.m@thinkpalm.com]
 * @create date 2018-10-26 11:44:32
 * @modify date 2018-10-26 11:44:32
 * @desc [page for sending image as byte stream by using ffmpeg]
*/

const spawn = require("child_process").spawn;
const express = require("express");
const app = express();
const fs = require("fs");
const parseString = require("xml2js").parseString;
const config = require("./config/config.json");
const os = require("os");
const logger = require("./loggerWinston");
const upath = require("upath");
const dataArray = {};
const procArray = {};
const xmlFile = __dirname + config.xml_path;
const cam_url = {};
let ffmpegPath;
/**
 * self-invoking function to generate an array of camera url from the xml doc
 */
(() => {
    let xml = fs.readFileSync(xmlFile, "utf8");
    parseString(xml, (err, xml) => {
        let path, ip, portNumber, protocol, userName, passWord;
        for (let i = 0; i < xml.vessel.camera.length; i++) { // for-loop for itrating through the xml doc to find camra url
            path = xml.vessel.camera[i].$.path;
            ip = xml.vessel.camera[i].$.IP;
            portNumber = xml.vessel.camera[i].$.portNumber;
            userName = xml.vessel.camera[i].$.userName;
            passWord = xml.vessel.camera[i].$.passWord;
            protocol = xml.vessel.camera[i].$.protocol;
            cam_url[xml.vessel.camera[i].$.id] = protocol + "://" + userName + ":" + passWord + "@" + ip + ":" + portNumber + "/" + path; // generating camera url
        }
    });
    setInterval(() => { // setting time interval to clear the log file in every 5 days
        fs.writeFile("./log/ffmpegLog.log", " ", () => { console.log(" cleared log file"); });
    }, 1000 * 60 * 60 * 24 * 5);
})();


/**
 * get_image request to start the image fetching
 */
app.get("/get_image", (request, response) => {
    let cam_id = request.query.cam_id;
    if (procArray[cam_id]) { // code to fetch image buffer from dataArray
        response.send(dataArray[cam_id]);
        console.log("fetching from existing dataArray");
        return;
    }
    for (let key in cam_url) {
        if (key == cam_id) {
            processCCTV(cam_id, cam_url[key], response);//function processCCTV() is called to start new ffmpeg
        }
    }
});

/**
 * processCCTV() function to start new ffmpeg which continuously for 30 seconds 
 * @param {*} cam_id 
 * @param {*} url 
 * @param {*} response 
 */
function processCCTV(cam_id, url, response) {
    console.log("spawining new ffmpeg");
    if (os.platform() == "win32")
        ffmpegPath = __dirname + "\\ffmpeg";
    else
        ffmpegPath =upath.toUnix( __dirname + "\\linuxffmpeg\\ffmpeg");
    const proc = spawn(ffmpegPath, ["-rtsp_transport", "tcp", "-y", "-i", url, "-ss", "00:00:01.500", "-vf", "fps=1/2", "-f", "image2pipe", "-"]);
    procArray[cam_id] = proc.pid;
    proc.stdout.on("data", (data) => {
        dataArray[cam_id] = data;
    });
    if (response) {
        response.send(dataArray[cam_id]);
    }
    proc.stderr.on("data", (data) => {
        logger.log({
            level: "info",
            message: `stderr: ${data}`
        });
    });
    proc.on("close", (code) => {
        logger.log({
            level: "info",
            message: `child process exited with code ${code}`
        });
    });
    setTimeout(() => {
        proc.stdin.pause();
        proc.kill();
        procArray[cam_id] = undefined;
    }, 30 * 1000);
}
app.listen(3001, () => {
    logger.log({
        level: "info",
        message: "sever started on port 3001"
    });
});