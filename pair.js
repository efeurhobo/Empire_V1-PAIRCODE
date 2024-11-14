const express = require('express');
const fs = require('fs');
const { exec } = require("child_process");
const router = express.Router();
const pino = require("pino");
const {
    default: makeWASocket,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore,
    Browsers,
    jidNormalizedUser
} = require("@whiskeysockets/baileys");
const { upload } = require('./mega');

function removeFile(filePath) {
    if (fs.existsSync(filePath)) {
        fs.rmSync(filePath, { recursive: true, force: true });
    }
}

router.get('/', async (req, res) => {
    let num = req.query.number;

    async function PrabathPair() {
        const { state, saveCreds } = await useMultiFileAuthState(`./session`);
        try {
            const PrabathPairWeb = makeWASocket({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
                },
                printQRInTerminal: false,
                logger: pino({ level: "fatal" }).child({ level: "fatal" }),
                browser: Browsers.macOS("Safari"),
            });

            if (!PrabathPairWeb.authState.creds.registered) {
                await delay(1500);
                num = num.replace(/[^0-9]/g, '');
                const code = await PrabathPairWeb.requestPairingCode(num);
                if (!res.headersSent) {
                    res.send({ code });
                }
            }

            PrabathPairWeb.ev.on('creds.update', saveCreds);

            PrabathPairWeb.ev.on("connection.update", async (s) => {
                const { connection, lastDisconnect } = s;
                if (connection === "open") {
                    try {
                        await delay(10000);
                        const sessionPrabath = fs.readFileSync('./session/creds.json');

                        const auth_path = './session/';
                        const user_jid = jidNormalizedUser(PrabathPairWeb.user.id);

                        function randomMegaId(length = 6, numberLength = 4) {
                            const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
                            let result = '';
                            for (let i = 0; i < length; i++) {
                                result += characters.charAt(Math.floor(Math.random() * characters.length));
                            }
                            const number = Math.floor(Math.random() * Math.pow(10, numberLength));
                            return `${result}${number}`;
                        }

                        const mega_url = await upload(fs.createReadStream(auth_path + 'creds.json'), `${randomMegaId()}.json`);
                        const string_session = mega_url.replace('https://mega.nz/file/', '');
                        const sid = string_session;

                        await PrabathPairWeb.sendMessage(user_jid, { text: sid });

                        const additionalMessage = `*𝘌𝘮𝘱𝘪𝘳𝘦_𝘝1 𝘊𝘖𝘕𝘕𝘌𝘊𝘛𝘌𝘋 𝘚𝘜𝘊𝘊𝘌𝘚𝘚𝘍𝘜𝘓𝘓𝘠*\n**𝐄𝐦𝐩𝐢𝐫𝐞_𝐕𝟏 𝐁𝐨𝐭**\n\n____________________________________\n╔════◇\n║ **『 𝘿𝙀𝙑𝙀𝙇𝙊𝙋𝙀𝙍 』**\n║ ❒ **𝐎𝐧𝐥𝐲_𝐨𝐧𝐞_🥇𝐞𝐦𝐩𝐢𝐫𝐞:** _https://t.me/only_one_empire_\n╚════════════════════❒\n\n╔═════◇\n║ **『 ••• 𝘙𝘌𝘗𝘖 𝘐𝘕𝘍𝘖 ••• 』**\n║ ❒ **𝐘𝐨𝐮𝐭𝐮𝐛𝐞:** _https://www.youtube.com/@only_one_empire_\n║ ❒ **𝐑𝐞𝐩𝐨:** _https://github.com/efeurhobo/Empire_V1.git_\n║ ❒ **𝐖𝐚𝐆𝐫𝐨𝐮𝐩:** _https://chat.whatsapp.com/DLrFOwuOnLwDS5VLeCuxHe_\n║ ❒ **𝐖𝐚𝐂𝐡𝐚𝐧𝐧𝐞𝐥:** _https://whatsapp.com/channel/0029VajVpQIyPtUbyO3k_\n║ \n╚════════════════════╝ \n\n**𝐎𝐧𝐥𝐲_𝐨𝐧𝐞_🥇𝐞𝐦𝐩𝐢𝐫𝐞 ☉ 𝐄𝐦𝐩𝐢𝐫𝐞_𝐕𝟏 𝐂𝐨𝐧𝐧𝐞𝐜𝐭𝐞𝐝 ☉**\n___________________________________\n\n**𝘋𝘰𝘯'𝘵 𝘍𝘰𝘳𝘨𝘦𝘵 𝘛𝘰 𝘎𝘪𝘷𝘦 𝘚𝘵𝘢𝘳 𝘛𝘰 𝘔𝘺 𝘙𝘦𝘱𝘰**`;
                        
                        await PrabathPairWeb.sendMessage(user_jid, { text: additionalMessage });

                    } catch (e) {
                        exec('pm2 restart prabath');
                    }

                    await delay(100);
                    removeFile('./session');
                    process.exit(0);
                } else if (connection === "close" && lastDisconnect && lastDisconnect.error && lastDisconnect.error.output.statusCode !== 401) {
                    await delay(10000);
                    PrabathPair();
                }
            });
        } catch (err) {
            exec('pm2 restart prabath-md');
            console.log("Service restarted");
            PrabathPair();
            removeFile('./session');
            if (!res.headersSent) {
                res.send({ code: "Service Unavailable" });
            }
        }
    }
    return await PrabathPair();
});

process.on('uncaughtException', function (err) {
    console.log('Caught exception: ' + err);
    exec('pm2 restart prabath');
});

module.exports = router;
