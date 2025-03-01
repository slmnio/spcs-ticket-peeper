import "dotenv/config";
import { Client, GatewayIntentBits, TextChannel } from "discord.js";

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
})

client.on("threadCreate", async (thread, newlyCreated) => {
    if (thread.guild.id !== process.env.SPCS_GUILD_ID) return console.log(`Thread ${thread.id} ${thread.name} is in guild ${thread.guild.id} ${thread.guild.name}, not SPCS`);
    if (thread.parent.id !== process.env.SPCS_THREAD_CHANNEL_ID) return console.log(`Thread ${thread.id} ${thread.name} is a child of ${thread.parent.id} ${thread.parent.name}, not the correct channel`);

    console.log(thread);

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
    console.log(`Logged in as ${client.user.tag}`)

    const threadChannel = await client.channels.fetch(process.env.SPCS_THREAD_CHANNEL_ID);
    const notifyChannel = await client.channels.fetch(process.env.SPCS_NOTIFY_CHANNEL_ID);
    const guild = await client.guilds.fetch(process.env.SPCS_GUILD_ID);
    console.log(`Watching:\n- guild ${guild?.id} ${guild?.name}\n- threads in channel ${threadChannel?.id} ${"name" in threadChannel ? threadChannel.name : ''}\n- posting to ${notifyChannel?.id} ${"name" in notifyChannel ? notifyChannel.name : ''}`)
});
client.login(process.env.DISCORD_TOKEN);
