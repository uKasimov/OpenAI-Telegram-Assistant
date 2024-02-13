const { Telegraf } = require('telegraf');
const OpenAI = require('openai');
require('dotenv').config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

bot.on('text', async (ctx) => {
    try {
        const assistantIdToUse = process.env.ASSISTANT_MODEL;

        const thread = await openai.beta.threads.create();

        // Corrected content format to be a string
        await openai.beta.threads.messages.create(thread.id, {
            role: 'user',
            content: ctx.message.text
        });

        let run = await openai.beta.threads.runs.create(thread.id, {
            assistant_id: assistantIdToUse,
            // instructions: 'You are a helpful assistant.',
        });

        while (run.status !== 'completed') {
            await new Promise(resolve => setTimeout(resolve, 1000));
            run = await openai.beta.threads.runs.retrieve(thread.id, run.id);
        }

        const messages = await openai.beta.threads.messages.list(thread.id);
        const assistantMessage = messages.data.find(m => m.role === 'assistant');

        if (assistantMessage && assistantMessage.content) {
            await ctx.reply(assistantMessage.content[0].text.value);
        } else {
            await ctx.reply("I couldn't find a response. Please try again.");
        }
    } catch (error) {
        console.error(error);
        await ctx.reply(`An error occurred: ${error.message}`);
    }
});

bot.launch();
