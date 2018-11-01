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
const upath = require("upath");
const logger = require("./loggerWinston");
const xmlFile = __dirname + config.xml_path;
let dataArray = {};
let procArray = {};
let cameraURL = {};
let ffmpegPath;
/**
 * self-invoking function to generate an array of camera url from the xml doc
 */
const initialise = (() => { //eslint-disable-line
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
            cameraURL[xml.vessel.camera[i].$.id] = protocol + "://" + userName + ":" + passWord + "@" + ip + ":" + portNumber + "/" + path; // generating camera url
        }
    });
})();


/**
 * get_image request to start the image fetching
 */
app.get("/get_image", (request, response) => {
    let cameraId = request.query.cameraId;
    response.set("Content-Type", "image/jpeg");
    if (procArray[cameraId]) { // code to fetch image buffer from dataArray
        response.send(dataArray[cameraId]);
        console.log("fetching from existing dataArray");
        return;
    }
    if (cameraURL.hasOwnProperty(cameraId)) {
        processCCTV(cameraId, cameraURL[cameraId], response);//function processCCTV() is called to start new ffmpeg
    }
});

/**
 * processCCTV() function to start new ffmpeg instance which continuously run for 30 seconds 
 * @param {*} cameraId 
 * @param {*} url 
 * @param {*} response 
 */
function processCCTV(cameraId, url, response) {
    console.log("spawining new ffmpeg");
    if (os.platform() == "win32") {
        ffmpegPath = __dirname + "\\windowsffmpeg\\ffmpeg";
    } else {
        ffmpegPath = upath.toUnix(__dirname + "\\linuxffmpeg\\ffmpeg");
    }
    const proc = spawn(ffmpegPath, ["-rtsp_transport", "tcp", "-y", "-i", url, "-ss", "00:00:01.500", "-vf", "fps=1/2", "-f", "image2pipe", "-"]);
    procArray[cameraId] = proc.pid;
    proc.stdout.on("data", (data) => {
        dataArray[cameraId] = data;
        if (response) {
            response.send(dataArray[cameraId]);
            response = undefined;
        }
    });

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

    setTimeout(() => { // setting  a 30 seconds timeout of to kill the spawned ffmpeg process
        proc.stdin.pause();
        proc.kill();
        procArray[cameraId] = undefined;
    }, 30 * 1000);
}

/**
 * setting the listening port number for the application
 */
app.listen(3001, () => {
    logger.log({
        level: "info",
        message: "sever started on port 3001"
    });
});