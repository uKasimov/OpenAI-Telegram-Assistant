const { Telegraf, Markup } = require('telegraf');
const OpenAI = require('openai');
require('dotenv').config()


const translations = {
    'en': {
        welcome: 'Select a question or type your own:',
        questions: [['Question 1', 'Question 2'], ['Question 3', 'Question 4']],
        askPrompt: 'You can ask me anything by typing /ask followed by your question.',
        askError: 'Please include a question after the /ask command.',
        responseNotFound: "I couldn't find a response. Please try again.",
        errorMessage: "An error occurred: "
    },
    'ru': {
        welcome: 'Выберите вопрос или напишите свой:',
        questions: [['Вопрос 1', 'Вопрос 2'], ['Вопрос 3', 'Вопрос 4']],
        askPrompt: 'Вы можете задать мне любой вопрос, набрав /ask, за которым следует ваш вопрос.',
        askError: 'Пожалуйста, включите вопрос после команды /ask.',
        responseNotFound: "Я не смог найти ответ. Пожалуйста, попробуйте еще раз.",
        errorMessage: "Произошла ошибка: "
    },
    'uz': {
        welcome: 'Bir savol tanlang yoki o\'zingiz yozing:',
        questions: [['Savol 1', 'Savol 2'], ['Savol 3', 'Savol 4']],
        askPrompt: '/ask komandasidan keyin savolingizni yozib, menga istalgan savolni bera olasiz.',
        askError: '/ask komandasi keyin savol kiritishingiz kerak.',
        responseNotFound: "Men javobni topa olmadim. Iltimos, yana urinib ko'ring.",
        errorMessage: "Xato yuz berdi: "
    }
};

const questions = {
    'en': [
        ['Analyze the latest trends in our industry.', 'Create a summary of recent news related to our field.'],
        ['Suggest a marketing strategy for our new product.', 'Draft a content plan for the next month.']
    ],
    'ru': [
        ['Анализируйте последние тенденции в нашей отрасли.', 'Создайте сводку последних новостей, связанных с нашей сферой.'],
        ['Предложите маркетинговую стратегию для нашего нового продукта.', 'Составьте план контента на следующий месяц.']

    ],
    'uz': [
        [`Bizning sohamizdagi so'nggi tendensiyalarni tahlil qiling.`, `Bizning sohamizga oid so'nggi yangiliklarning xulosasini yarating.`],
        [`Yangi mahsulotimiz uchun marketing strategiyasini taklif qiling.`, `Keyingi oy uchun kontent rejasini tuzing.`]
    ]
};



const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});


const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

async function simulateTyping(ctx, processingMessageId) {
    const symbols = ['.', '..', '...'];
    for (let i = 0; i < 5; i++) {
        for (const symbol of symbols) {
            try {
                await ctx.telegram.editMessageText(ctx.chat.id, processingMessageId, null, symbol);
                await new Promise(resolve => setTimeout(resolve, 2000)); // Задержка в 1500 мс
            } catch (error) {
                console.error('Ошибка при редактировании сообщения:', error);
                break;
            }
        }
    }
}

// Function to send a message with a reply keyboard for common questions in private chats
const userLanguages = {};

bot.start((ctx) => {
    ctx.reply('Please select your language / Пожалуйста, выберите ваш язык / Iltimos, tilni tanlang:', Markup.inlineKeyboard([
        [Markup.button.callback('English 🇺🇸', 'language_en')],
        [Markup.button.callback('Русский 🇷🇺', 'language_ru')],
        [Markup.button.callback('O‘zbek 🇺🇿', 'language_uz')]
    ]));
});
bot.action(['language_en', 'language_ru', 'language_uz'], (ctx) => {
    const selectedLanguage = ctx.match.input.split('_')[1];

    // Assuming you might store the user's language preference here

    ctx.deleteMessage(); // Optional: Clear the language selection message
    sendQuestionsKeyboard(ctx, selectedLanguage);
});

function sendQuestionsKeyboard(ctx, languageCode) {
    const languageQuestions = questions[languageCode];
    const replyMessage = {
        'en': 'Select a question or type your own:',
        'ru': 'Выберите вопрос или напишите свой:',
        'uz': 'Bir savol tanlang yoki o‘zingiz yozing:'
    }[languageCode];

    ctx.reply(replyMessage, Markup.keyboard(languageQuestions).resize().oneTime());
}

bot.hears([...Object.values(questions.en).flat(), ...Object.values(questions.ru).flat(), ...Object.values(questions.uz).flat()], async (ctx) => {
    const questionText = "Mapped question based on user selection"; // Implement actual mapping
    await processQuestion(ctx, ctx.message.text)
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
bot.on('text', async (ctx) => {
    // In private chats, directly process any text input as a question
    if (ctx.chat.type === 'private' && !ctx.message.text.startsWith('/')) {
        await processQuestion(ctx, ctx.message.text);
    }
    // Ignore other text messages in group chats
});

bot.catch(e => {
    setTimeout(console.log(`dont panic: ${e}`), 3000)
});
async function processQuestion(ctx, questionText) {
    const userId = ctx.from.id;
    const languageCode = userLanguages[userId] || 'en';
    const userTranslations = translations[languageCode];

    try {
        const assistantIdToUse = process.env.ASSISTANT_MODEL;
        const thread = await openai.beta.threads.create();
        await openai.beta.threads.messages.create(thread.id, { role: 'user', content: questionText });

        // Send a message with three dots to indicate processing
        let processingMessage = await ctx.reply("..."); // Сообщение, которое будет редактироваться для эффекта моргания
        await simulateTyping(ctx, processingMessage.message_id); // Вызов функции для имитации "печати"

        let run = await openai.beta.threads.runs.create(thread.id, { assistant_id: assistantIdToUse });

        while (run.status !== 'completed') {
            await new Promise(resolve => setInterval(resolve, 3000));
            run = await openai.beta.threads.runs.retrieve(thread.id, run.id);
        }

        const messages = await openai.beta.threads.messages.list(thread.id);
        const assistantMessage = messages.data.find(m => m.role === 'assistant');

        if (assistantMessage && assistantMessage.content) {
            const responseText = assistantMessage.content[0].text.value;
            // Разделяем текст на абзацы
            const paragraphs = responseText.split('\n\n');

            let currentText = '';
            for (let i = 0; i < paragraphs.length; i++) {
                // Добавляем небольшую задержку перед добавлением каждого абзаца
                await new Promise(resolve => setTimeout(resolve, 1500)); // Задержка перед редактированием

                // Добавляем абзац к текущему тексту
                currentText += paragraphs[i] + '\n\n'; // Добавляем два переноса строки для сохранения форматирования абзацев
                // Редактируем сообщение, чтобы добавить новый абзац
                await ctx.telegram.editMessageText(ctx.chat.id, processingMessage.message_id, null, currentText.trim());

                // Ожидаем некоторое время перед добавлением следующего абзаца
                await new Promise(resolve => setTimeout(resolve, 3000)); // Дополнительная задержка между абзацами
            }
        }
        else {
            // If no assistant message found, replace the processing message with a not found message
            await ctx.telegram.editMessageText(ctx.chat.id, processingMessage.message_id, null, userTranslations.responseNotFound);
        }
    } catch (error) {
        if (error.code === 429) {
            console.log(`Retrying after ${error.parameters.retry_after} seconds`);
            setTimeout(() => {
                processQuestion(ctx, questionText); // Повторный вызов функции после задержки
            }, error.parameters.retry_after * 1000); // Преобразование секунд в миллисекунды
        } else {
            console.error(error);
            await ctx.reply("An error occurred. Please try again later.");
        }
    }
}

bot.hears([...Object.values(questions['en']).flat(), ...Object.values(questions['ru']).flat(), ...Object.values(questions['uz']).flat()], async (ctx) => {
    // Process the selected question with consideration to the user's language preference
    await processQuestion(ctx, ctx.message.text);
});

bot.action(['language_en', 'language_ru', 'language_uz'], (ctx) => {
    const selectedLanguage = ctx.match.input.split('_')[1];
    const userId = ctx.from.id;

    // Set the user's language preference
    userLanguages[userId] = selectedLanguage;

    ctx.deleteMessage(); // Optional: Clear the language selection message
    sendQuestionsKeyboard(ctx, selectedLanguage);
});

bot.launch();