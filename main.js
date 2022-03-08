const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, "./secret.env")});
const { WebClient } = require('@slack/web-api');
const { createEventAdapter } = require('@slack/events-api');
const moment = require("moment");

const slackEvents = createEventAdapter(process.env.SIGNING_SECRET);
const port = process.env.PORT || 3000;
const web = new WebClient(process.env.BOT_AUTH_TOKEN);

const TIME_RX = /[1-9]\d?(([:. ]\d{2}([ ]?[a|p]m)?)|([ ]?[a|p]m))/i

const hasTimeString = (s) => TIME_RX.test(s)
const parseTime = (s) => s.match(TIME_RX)[0]
const clockEmoji = (m) => `:clock${(m.hours() % 12) || 12}:`
const normalizeTime = (s) => moment(s, 'h:mA').format('h:mm A')

slackEvents.on('message', async (event) => {
    const {text, user, channel, team, bot_id} = event;
    if ( bot_id ) return;
    if (!hasTimeString(text)) return;

    // get all users and their timezones in this team
    const users = await web.users.list({ team });
    const timezones = users.members.filter((member) => !(member.id === user))
        .map((user) => ({ offset: user.tz_offset / 60, label: user.tz_label}))
    const sender = users.members.find(member => member.id === user);
    const timeString = normalizeTime(parseTime(text));

    const parsedTime = moment(timeString, 'h:mm A');
    if (!parsedTime.isValid()) return;
    
    const uniqueArray = Array.from(new Set(timezones.map(JSON.stringify))).map(JSON.parse);
    uniqueArray.forEach((timezoneInfo) => {
        const timeResponse = moment(parsedTime).utcOffset(timezoneInfo.offset).format("YYYY-MM-DD h:mm A");
        console.log(timeResponse);
        web.chat.postMessage({ channel,
             text: `*${timeString}* is *${timeResponse} in ${timezoneInfo.label}*.`, 
             asUser: false, 
             username: 'Tell my timezone', 
             iconEmoji: clockEmoji(parsedTime) });
    });
});

// Handle errors (see `errorCodes` export)
slackEvents.on('error', console.error);

// Start a basic HTTP server
slackEvents.start(port).then(() => {
    // Listening on path '/slack/events' by default
    console.log(`server listening on port ${port}`);
});


