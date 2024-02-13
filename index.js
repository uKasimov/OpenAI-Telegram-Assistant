const { Telegraf, Markup } = require('telegraf');
const OpenAI = require('openai');
require('dotenv').config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});



const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// Function to send a message with a reply keyboard for common questions in private chats
function sendReplyKeyboard(ctx) {
    ctx.reply('Select a question or type your own:', Markup.keyboard([
        ['Question 1', 'Question 2'], // These can be your common questions
        ['Question 3', 'Question 4']  // Adjust these placeholders as needed
    ]).resize().oneTime());
}

bot.start((ctx) => {
    if (ctx.chat.type === 'private') {
        sendReplyKeyboard(ctx);
    } else {
        ctx.reply('You can ask me anything by typing /ask followed by your question.');
    }
});

bot.command('ask', async (ctx) => {
    // Check if it's a group chat to apply the /ask command logic
    if (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup') {
        const messageText = ctx.message.text.split(' ').slice(1).join(' ');
        if (!messageText) {
            return ctx.reply('Please include a question after the /ask command.');
        }
        // Process the question from the /ask command
        await processQuestion(ctx, messageText);
    }
});

// Handle common questions selected from the reply keyboard or direct questions in private chats
bot.hears(['Question 1', 'Question 2', 'Question 3', 'Question 4'], async (ctx) => {
    // Here you would map the selected option to the actual question
    const questionText = "Mapped question based on user selection"; // Implement actual mapping
    await processQuestion(ctx, questionText);
});

bot.on('text', async (ctx) => {
    // In private chats, directly process any text input as a question
    if (ctx.chat.type === 'private' && !ctx.message.text.startsWith('/')) {
        await processQuestion(ctx, ctx.message.text);
    }
    // Ignore other text messages in group chats
});

async function processQuestion(ctx, questionText) {
    try {
        const assistantIdToUse = process.env.ASSISTANT_MODEL;
        const thread = await openai.beta.threads.create();

        await openai.beta.threads.messages.create(thread.id, {
            role: 'user',
            content: questionText
        });

        let run = await openai.beta.threads.runs.create(thread.id, {
            assistant_id: assistantIdToUse,
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
}

bot.launch();
