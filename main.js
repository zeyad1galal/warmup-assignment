
const fs = require("fs");

//converting from 12-hour time to seconds
// into total seconds from midnight
function timeToSeconds(timeStr) {

    if (!timeStr) {
        return 0;
    }

    let [time, period] = timeStr.split(" ");
    let [hours, minutes, seconds] = time.split(":").map(Number);

    period = period.toLowerCase();

    // Convert PM times to 24-hour format
    if (period === "pm" && hours !== 12) {
        hours += 12;
    }

    // Convert 12 AM to 00 hours
    if (period === "am" && hours === 12) {
        hours = 0;
    }

    let totalSeconds = hours * 3600 + minutes * 60 + seconds;

    return totalSeconds;
}

// Helper method convert seconds into h:mm:ss 
function secondsToHMS(totalSeconds) {

    if (totalSeconds < 0) {
        return "0:00:00";
    }

    let hours = Math.floor(totalSeconds / 3600);
    let minutes = Math.floor((totalSeconds % 3600) / 60);
    let seconds = totalSeconds % 60;

    return hours + ":" +
        String(minutes).padStart(2, "0") + ":" +
        String(seconds).padStart(2, "0");
}

// helper method convert h:mm:ss into total seconds
function hmsToSeconds(hms) {

    if (!hms) {
        return 0;
    }

    let parts = hms.split(":");

    let hours = parseInt(parts[0]);
    let minutes = parseInt(parts[1]);
    let seconds = parseInt(parts[2]);

    let totalSeconds = hours * 3600 + minutes * 60 + seconds;

    return totalSeconds;
}

// Helper method get month from using yyyy-mm-d
function getMonthFromDate(dateStr) {

    if (!dateStr) {
        return -1;
    }

    let parts = dateStr.split("-");
    let month = parseInt(parts[1]);

    return month;
}

// helper method read all lines from a text file
// Returns an array of lines
function readFileLines(filePath) {

    try {

        let data = fs.readFileSync(filePath, "utf8");

        if (data.trim() === "") {
            return [];
        }

        return data.trim().split("\n");

    } catch (error) {

        return [];
    }
}

// helper method write lines back to a text file
function writeFileLines(filePath, lines) {

    try {

        fs.writeFileSync(filePath, lines.join("\n"));


    } catch (error) {

    }
}
// ============================================================
// Function 1: getShiftDuration(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getShiftDuration(startTime, endTime) {

        let startSeconds = timeToSeconds(startTime);
        let endSeconds = timeToSeconds(endTime);

        let durationSeconds = endSeconds - startSeconds;

        if (durationSeconds < 0) {
            return "0:00:00";
        }

        let result = secondsToHMS(durationSeconds);


        return result;
    }


// ============================================================
// Function 2: getIdleTime(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getIdleTime(startTime, endTime) {

    let start = timeToSeconds(startTime);
    let end = timeToSeconds(endTime);

    let workStart = 8 * 3600;
    let workEnd = 22 * 3600;

    let idleSeconds = 0;

    if (start < workStart) {
        idleSeconds += Math.min(end, workStart) - start;
    }

    if (end > workEnd) {
        idleSeconds += end - Math.max(start, workEnd);
    }

    if (idleSeconds < 0) idleSeconds = 0;

    let result = secondsToHMS(idleSeconds);


    return result;
}


// ============================================================
// Function 3: getActiveTime(shiftDuration, idleTime)
// shiftDuration: (typeof string) formatted as h:mm:ss
// idleTime: (typeof string) formatted as h:mm:ss
// Returns: string formatted as h:mm:ss
// ============================================================
function getActiveTime(shiftDuration, idleTime) {

    let shiftSeconds = hmsToSeconds(shiftDuration);
    let idleSeconds = hmsToSeconds(idleTime);

    let activeSeconds = shiftSeconds - idleSeconds;

    if (activeSeconds < 0) activeSeconds = 0;

    let result = secondsToHMS(activeSeconds);


    return result;
}

// ============================================================
// Function 4: metQuota(date, activeTime)
// date: (typeof string) formatted as yyyy-mm-dd
// activeTime: (typeof string) formatted as h:mm:ss
// Returns: boolean
// ============================================================
function metQuota(date, activeTime) {

    let activeSeconds = hmsToSeconds(activeTime);

    let normalQuota = (8 * 3600) + (24 * 60);
    let eidQuota = 6 * 3600;

    if (date >= "2025-04-10" && date <= "2025-04-30") {
        return activeSeconds >= eidQuota;
    }

    return activeSeconds >= normalQuota;
}

// ============================================================
// Function 5: addShiftRecord(textFile, shiftObj)
// textFile: (typeof string) path to shifts text file
// shiftObj: (typeof object) has driverID, driverName, date, startTime, endTime
// Returns: object with 10 properties or empty object {}
// ============================================================
function addShiftRecord(textFile, shiftObj) {

    let lines = readFileLines(textFile);

    for (let line of lines) {

        let parts = line.split(",");

        if (parts[0] === shiftObj.driverID && parts[2] === shiftObj.date) {
            return {};
        }
    }

    let shiftDuration = getShiftDuration(shiftObj.startTime, shiftObj.endTime);
    let idleTime = getIdleTime(shiftObj.startTime, shiftObj.endTime);
    let activeTime = getActiveTime(shiftDuration, idleTime);
    let quota = metQuota(shiftObj.date, activeTime);
    let hasBonus = false;

    let newLine = [
        shiftObj.driverID,
        shiftObj.driverName,
        shiftObj.date,
        shiftObj.startTime,
        shiftObj.endTime,
        shiftDuration,
        idleTime,
        activeTime,
        quota,
        hasBonus
    ].join(",");

    lines.push(newLine);

    writeFileLines(textFile, lines);

    return {
        driverID: shiftObj.driverID,
        driverName: shiftObj.driverName,
        date: shiftObj.date,
        startTime: shiftObj.startTime,
        endTime: shiftObj.endTime,
        shiftDuration,
        idleTime,
        activeTime,
        metQuota: quota,
        hasBonus
    };
}
// ============================================================
// Function 6: setBonus(textFile, driverID, date, newValue)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// date: (typeof string) formatted as yyyy-mm-dd
// newValue: (typeof boolean)
// Returns: nothing (void)
// ============================================================
function setBonus(textFile, driverID, date, newValue) {

    let lines = readFileLines(textFile);

    for (let i = 0; i < lines.length; i++) {

        let parts = lines[i].split(",");

        if (parts[0] === driverID && parts[2] === date) {

            parts[9] = newValue;

            lines[i] = parts.join(",");

            break;
        }
    }

    writeFileLines(textFile, lines);
}

// ============================================================
// Function 7: countBonusPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof string) formatted as mm or m
// Returns: number (-1 if driverID not found)
// ============================================================
function countBonusPerMonth(textFile, driverID, month) {

    let lines = readFileLines(textFile);

    let foundDriver = false;
    let count = 0;

    for (let line of lines) {

        let parts = line.split(",");

        let id = parts[0];
        let date = parts[2];
        let bonus = parts[9];

        let recordMonth = getMonthFromDate(date);

        if (id === driverID) {

            foundDriver = true;

            if (recordMonth == month && bonus === "true") {
                count++;
            }
        }
    }

    if (!foundDriver) {
        return -1;
    }


    return count;
}

// ============================================================
// Function 8: getTotalActiveHoursPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getTotalActiveHoursPerMonth(textFile, driverID, month) {


    let lines = readFileLines(textFile);

    let totalSeconds = 0;

    for (let line of lines) {

        let parts = line.split(",");

        let id = parts[0];
        let date = parts[2];
        let active = parts[7];

        if (id === driverID && getMonthFromDate(date) == month) {

            totalSeconds += hmsToSeconds(active);
        }
    }

    let result = secondsToHMS(totalSeconds);


    return result;
}

// ============================================================
// Function 9: getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month)
// textFile: (typeof string) path to shifts text file
// rateFile: (typeof string) path to driver rates text file
// bonusCount: (typeof number) total bonuses for given driver per month
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month) {

    let lines = readFileLines(textFile);

    let normalQuota = (8 * 3600) + (24 * 60); // 8:24
    let eidQuota = 6 * 3600;

    let totalSeconds = 0;

    for (let line of lines) {

        let parts = line.split(",");

        let id = parts[0];
        let date = parts[2];

        if (id === driverID && getMonthFromDate(date) == month) {

            if (date >= "2025-04-10" && date <= "2025-04-30") {
                totalSeconds += eidQuota;
            } else {
                totalSeconds += normalQuota;
            }
        }
    }

    totalSeconds -= bonusCount * (2 * 3600);

    if (totalSeconds < 0) totalSeconds = 0;

    return secondsToHMS(totalSeconds);
}
// Function 10: getNetPay(driverID, actualHours, requiredHours, rateFile)
// driverID: (typeof string)
// actualHours: (typeof string) formatted as hhh:mm:ss
// requiredHours: (typeof string) formatted as hhh:mm:ss
// rateFile: (typeof string) path to driver rates text file
// Returns: integer (net pay)
// ============================================================
function getNetPay(driverID, actualHours, requiredHours, rateFile) {

    let lines = readFileLines(rateFile);

    let basePay = 0;
    let tier = 0;

    for (let line of lines) {
        let parts = line.split(",");
        if (parts[0] === driverID) {
            basePay = parseInt(parts[2]);
            tier = parseInt(parts[3]);
            break;
        }
    }

    if (basePay === 0) return 0;

    let actualSeconds = hmsToSeconds(actualHours);
    let requiredSeconds = hmsToSeconds(requiredHours);

    let missingHours = (requiredSeconds - actualSeconds) / 3600;

    if (missingHours <= 0) return basePay;

    
    let allowed = 0;
    if (tier === 1) allowed = 50;
    else if (tier === 2) allowed = 20;
    else if (tier === 3) allowed = 10;
    else if (tier === 4) allowed = 3;

    let remainingMissing = missingHours - allowed;

    if (remainingMissing <= 0) return basePay;

  
    remainingMissing = Math.floor(remainingMissing);

    let deductionRatePerHour = Math.floor(basePay / 185);

    let salaryDeduction = remainingMissing * deductionRatePerHour;

    return basePay - salaryDeduction;
}
module.exports = {
    getShiftDuration,
    getIdleTime,
    getActiveTime,
    metQuota,
    addShiftRecord,
    setBonus,
    countBonusPerMonth,
    getTotalActiveHoursPerMonth,
    getRequiredHoursPerMonth,
    getNetPay
};
