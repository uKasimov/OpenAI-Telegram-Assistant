# Telegram Bot for Processing Questions with OpenAI

This project implements a Telegram bot that processes user questions by interacting with the OpenAI API. It dynamically handles conversations, offering real-time responses and simulating a typing effect for enhanced user engagement.

## Features
- Utilizes OpenAI's API to fetch responses to user queries.
- Simulates typing effect for a more interactive user experience.
- Supports dynamic language translation based on user preferences.

## Setup
1. Clone the repository.
2. Install dependencies: `yarn install`.
3. Set environment variables: `ASSISTANT_MODEL` with your OpenAI Assistant Model ID.
3. Set environment variables: `OPENAI_API_KEY` with your OpenAI API KEY.
3. Set environment variables: `TELEGRAM_BOT_TOKEN` with your Telegram Bot Token Key.
4. Run the bot in dev mode: `yarn start:dev`.

## Usage
Send a message to the bot, and it will reply after processing your query with the OpenAI API.

## Contributions
Contributions are welcome. Please submit a pull request or open an issue for any bugs or feature suggestions.

## License
Distributed under the MIT License. See `LICENSE` for more information.
