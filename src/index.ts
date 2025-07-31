import "dotenv/config";
import { Client, GatewayIntentBits, TextChannel } from "discord.js";
import Airtable from "airtable";

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
})

client.on("threadCreate", async (thread, newlyCreated) => {
    if (thread.guild.id !== process.env.SPCS_GUILD_ID) return console.log(`Thread ${thread.id} ${thread.name} is in guild ${thread.guild.id} ${thread.guild.name}, not SPCS`);
    if (!thread.parent) return console.log(`No parent channel for this thread ${thread.id} ${thread.name}`);
    if (thread.parent.id !== process.env.SPCS_THREAD_CHANNEL_ID) return console.log(`Thread ${thread.id} ${thread.name} is a child of ${thread.parent?.id} ${thread.parent?.name}, not the correct channel`);

    console.log(thread);

    if (!process.env.SPCS_NOTIFY_CHANNEL_ID) return console.error("No notify channel is setup");
    const notifyChannel = await client.channels.fetch(process.env.SPCS_NOTIFY_CHANNEL_ID);
    if (!notifyChannel) return console.error(`Could not find the correct notification channel ${notifyChannel}`)

    console.log(`Ready to notify about new thread ${thread.id}`);

    if (!(notifyChannel instanceof TextChannel)) {
        return console.error(`Channel ${notifyChannel.id} is not a text channel, so can't send to it.`);
    }
    await notifyChannel.send(`*View ticket silently: <#${thread.id}>*`).catch(e => {
        console.error(e);
    })
})

client.once("ready", async () => {
    console.log(`Logged in as ${client.user?.tag}`)

    const threadChannel = process.env.SPCS_THREAD_CHANNEL_ID ? await client.channels.fetch(process.env.SPCS_THREAD_CHANNEL_ID) : null;
    const notifyChannel = process.env.SPCS_NOTIFY_CHANNEL_ID ? await client.channels.fetch(process.env.SPCS_NOTIFY_CHANNEL_ID) : null;
    const guild = process.env.SPCS_GUILD_ID ? await client.guilds.fetch(process.env.SPCS_GUILD_ID) : null;
    console.log(`Watching:\n- guild ${guild?.id} ${guild?.name}\n- threads in channel ${threadChannel?.id} ${threadChannel && "name" in threadChannel ? threadChannel.name : ''}\n- posting to ${notifyChannel?.id} ${notifyChannel && "name" in notifyChannel ? notifyChannel.name : ''}`)
});
client.login(process.env.DISCORD_TOKEN);


if (process.env.SPCS_AIRTABLE_KEY && process.env.SPCS_AIRTABLE_APP && process.env.SPCS_AIRTABLE_ALERT_CHANNEL_ID) {
    const airtable = new Airtable({ apiKey: process.env.SPCS_AIRTABLE_KEY });
    const base = airtable.base(process.env.SPCS_AIRTABLE_APP);

    const store = new Map();

    await checkLoop();
    setInterval(() => checkLoop(), 10_000);

    async function checkLoop() {
        const applicationData = await base.table("Series 3 Team Applications").select().all();
        const rosterData = await base.table("Series 3 Roster Submissions").select().all();

        const messages: string[] = [];

        if (store.size === 0) {
            // First run
            console.log("[airtable] First run - setting items")
            applicationData.forEach((record) => {
                store.set(record.id, record.fields);
            })
            rosterData.forEach((record) => {
                store.set(record.id, record.fields);
            })
            console.log(`[airtable] First run - ${store.size} items saved`)
        } else {
            // Other run - do checks

            applicationData.forEach((record) => {
                if (store.has(record.id)) return;

                messages.push(`📑 New application for ${(record.get("Competition Division")?.toString())?.split(' ')?.[0]}: **${record.get("Team Name") || "(unknown)"}** by ${[record.get("Name") || null, record.get("Secondary Contact (If applicable)") || null].filter(s => !!s).join("/")}. [See on Airtable](<https://airtable.com/appHuNcTOEhu8yXqI/tbliUkHCpNoDub7EA/viw3akw3XeQymUsyV/${record.id}?blocks=hide>)`)
                store.set(record.id, record.fields);
            })

            rosterData.forEach((record) => {
                if (store.has(record.id)) return;

                let playerCount = 0;

                [1,2,3,4,5,6,7,8,9,10].forEach(playerNum => {
                    if (record.get(`Player ${playerNum} Battletag`) || record.get(`Player ${playerNum} Discord`)) {
                        playerCount = playerNum;
                    }
                })

                messages.push(`📝 New roster submission for ${(record.get("Competition Division")?.toString())?.split(' ')?.[0]}: **${record.get("Team Name") || "(unknown)"}** by ${[record.get("Team Manager (Discord Tag)") || null].filter(s => !!s).join("/")} with ${playerCount} player${playerCount === 1 ? '' : 's'}. [See on Airtable](<https://airtable.com/appHuNcTOEhu8yXqI/tbllX1IjY8YNvJY75/viwDOZV5dKjguXQp2/${record.id}?blocks=hide>)`)
                store.set(record.id, record.fields);
            })

            console.log(messages);
        }

        if (messages.length && process.env.SPCS_AIRTABLE_ALERT_CHANNEL_ID) {
            const staffNotifyChannel = await client.channels.fetch(process.env.SPCS_AIRTABLE_ALERT_CHANNEL_ID);
            if (!staffNotifyChannel?.isSendable()) {
                return console.error(`No channel found to send messages to`, process.env.SPCS_AIRTABLE_ALERT_CHANNEL_ID)
            }
            // console.log(`DUMMY SEND ${staffNotifyChannel?.name}`, messages.join("\n"));
            staffNotifyChannel.send(messages.join("\n"));
        }
    }


} else {
    console.warn(`SPCS Airtable checker not initialised - needs SPCS_AIRTABLE_KEY, SPCS_AIRTABLE_APP and SPCS_AIRTABLE_ALERT_CHANNEL_ID set`)
}
