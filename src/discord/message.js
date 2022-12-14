import Discord, { messageLink } from 'discord.js';
import c from '../logman.cjs';
import { bot } from './index.js';
import { db } from '../db/index.js';

import replies from '../../conf/replies.js';

const fetchExists = db.prepare("SELECT * FROM d_msg_count WHERE UID = ?");
const incrCount = db.prepare("UPDATE d_msg_count SET lastSeen = current_timestamp, numSent = numSent + 1 WHERE UID = ?");
const newCount = db.prepare("INSERT INTO d_msg_count(UID) VALUES(?)");

const incrJokeCount = db.prepare("UPDATE joke_count SET count = count + 1 WHERE joke = ?");
const addJokeCount = db.prepare("INSERT INTO joke_count(joke) VALUES(?)");
const fetchJokeCount = db.prepare("SELECT count FROM joke_count WHERE joke = ?").pluck();

bot.on("messageCreate", (msg)=>{
    if (msg.author == bot.user) return;

    updateCounter(msg);

    if (mentioned(msg)) return;

    message(msg);
});

function updateCounter(msg) {
    const UID = msg.author.id;
    const exists = fetchExists.pluck().get(UID);

    if (exists) {
        incrCount.run(UID);
    } else {
        newCount.run(UID);
    }
}

function mentioned(msg) {
    if (msg.mentions.has(bot.user)) {
        var response = pickRandom(replies.mention);

        response = response.replaceAll("<USER>", msg.member.displayName);

        msg.reply(response);

        return true;
    }
}

function message(msg) {
    const re_for_im = /[^\w]+I[ ']?a?m (?<text>\w* ?\w*) */gmi
    
    //----------------- Check for "I am" - joke
    var res = re_for_im.exec(msg.content);
    res = res?.groups?.text;
    if (res) {
        if (Math.random() > replies.odds["I'm"]) return;

        var text = pickRandom(replies.replies["I'm"]);
        text = text.replaceAll("<TEXT>", res);
        incrJokeCount.run("I'm");
        msg.channel.send(text);
    }

    //------------------ Check for "I love" reply
    const love_re = /I .*love (?<text>[\w ]*).*$/gi
    var res = re_for_im.exec(msg.content);
    res = res?.groups?.text;
    if (res) {
        if (Math.random() > replies.odds["I love"]) return;

        var text = pickRandom(replies.replies["I love"]);
        text = text.replaceAll("<TEXT>", res);
        incrJokeCount.run("I love");
        msg.reply({content: text, allowedMentions: {
            repliedUser: false
        }});
    }

    //------------------ Check for "I will" reply

    const will_re = /I will/gmi;
    if (will_re.test(msg.content)) {
        if (Math.random() > replies.odds["I will"]) return;

        var text = pickRandom(replies.replies["I will"]);
        incrJokeCount.run("I will");
        msg.reply({content: text, allowedMentions: {
            repliedUser: false
        }});
    }

    //------------------ Check for "It will" reply

    const willit_re = /It will/gmi;
    if (will_re.test(msg.content)) {
        if (Math.random() > replies.odds["It will"]) return;

        var text = pickRandom(replies.replies["It will"]);
        incrJokeCount.run("It will");
        msg.reply({content: text, allowedMentions: {
            repliedUser: false
        }});
    }
}

function pickRandom(array) {
    const i = Math.floor(Math.random() * array.length);
    return array[i];
}

const keys = ["I'm", "I love", "I will", "It will"];
function setupCounters() {
    keys.forEach(key => {
        if (fetchJokeCount.get(key) === null)
            addJokeCount.run(key);
    });
}
setupCounters();