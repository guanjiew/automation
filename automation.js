const puppeteer = require('puppeteer');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '.config');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const url = "https://reservation.pc.gc.ca/create-booking/results?editBooking=true&resourceLocationId=-2147483642&mapId=-2147483089&bookingCategoryId=9&startDate=2024-06-29&endDate=2024-06-30&nights=1&isReserving=true&partySize=1&filterData=%7B%7D&searchTime=2024-06-11T22:34:35.255&flexibleSearch=%5Bfalse,false,null,1%5D&searchTabGroupId=3";
const slackWebhookURL = config.slackWebhookURL;

const fetchHtml = async (url) => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });
    const html = await page.content();
    await browser.close();
    return html;
};

const checkForPattern = (html, pattern) => {
    const regex = new RegExp(pattern, 'g');
    return regex.test(html);
};

const sendToSlack = async (message) => {
    if (slackWebhookURL) {
        try {
            await axios.post(slackWebhookURL, {
                text: message,
            });
            console.log("Message sent to Slack successfully.");
        } catch (error) {
            console.error("Error sending message to Slack:", error);
        }
    }
};

// Main function
const main = async () => {
    const html = await fetchHtml(url);
    if (!html) {
        console.error('Failed to fetch the HTML content.');
        return;
    }

    const unavailablePattern = '<td .* aria-label="LL: 1pm-2pm Departures Unavailable ">.*</td>';
    const availablePattern = '<td .* aria-label="LL: 1pm-2pm Departures Available ">.*</td>';

    if (checkForPattern(html, unavailablePattern)) {
        console.log('1pm-2pm Departures are currently unavailable.');
        await sendToSlack('1pm-2pm Departures are now available!');
    } else if (checkForPattern(html, availablePattern)) {
        console.log('1pm-2pm Departures are now available!');
        await sendToSlack('1pm-2pm Departures are now available!');
    } else {
        console.log('The status of 1pm-2pm Departures has not been found or does not match the specified patterns.');
    }
};

main();