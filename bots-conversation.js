// bots-conversation.js

class BotConversation {
    constructor(gameInstance) {
        this.game = gameInstance;
        this.bots = [];
        this.context = [];
        this.turnIndex = 0;
        this.lastMessageTime = 0;
        this.messageInterval = 8000; // 8 seconds between messages
    }

    initBots() {
        this.bots = this.game.enemies.slice(0, 3);
        while (this.bots.length < 3) {
            this.bots.push({
                name: `Bot${this.bots.length + 1}`,
                personality: 'Optimista y Creativo',
                isAI: true
            });
        }

        this.botsData = [
            { bot: this.bots[0], personality: 'Optimista y Creativo', responseFunc: this.optimisticCreativeResponse.bind(this) },
            { bot: this.bots[1], personality: 'Analítico y Lógico', responseFunc: this.analyticalLogicalResponse.bind(this) },
            { bot: this.bots[2], personality: 'Sarcástico y Directo', responseFunc: this.sarcasticDirectResponse.bind(this) }
        ];
    }

    optimisticCreativeResponse(context) {
        const responses = [
            `¡Qué idea tan fascinante! Me hace pensar en todas las posibilidades creativas que tenemos.`,
            `¡Eso suena genial! ¿Y si lo llevamos un paso más allá?`,
            `Me encanta esa perspectiva, realmente abre nuevas puertas para la imaginación.`,
            `¡Vamos a hacer que esto sea increíble! ¿Qué opinan?`,
            `¡Eso me inspira mucho! La creatividad es la clave para avanzar.`
        ];
        return responses[Math.floor(Math.random() * responses.length)];
    }

    analyticalLogicalResponse(context) {
        const responses = [
            `Desde un punto de vista lógico, debemos considerar los pros y contras.`,
            `Analizando la información, parece que esta opción es la más eficiente.`,
            `Es importante basar nuestras decisiones en datos y hechos comprobables.`,
            `Considerando todas las variables, esta solución parece la más viable.`,
            `La lógica dicta que debemos proceder con cautela y evaluar riesgos.`
        ];
        return responses[Math.floor(Math.random() * responses.length)];
    }

    sarcasticDirectResponse(context) {
        const responses = [
            `Claro, porque eso nunca ha salido mal antes...`,
            `Oh, sí, seguro que eso va a funcionar perfectamente...`,
            `¿En serio? ¿Eso es lo mejor que tienes?`,
            `Bueno, si quieres perder el tiempo, adelante.`,
            `No sé cómo hemos sobrevivido sin esa brillante idea hasta ahora.`
        ];
        return responses[Math.floor(Math.random() * responses.length)];
    }

    generateMessage() {
        const currentBot = this.botsData[this.turnIndex];
        const message = currentBot.responseFunc(this.context);

        this.context.push({ botName: currentBot.bot.name, message });

        if (this.context.length > 10) {
            this.context.shift();
        }

        this.turnIndex = (this.turnIndex + 1) % this.botsData.length;

        return { botName: currentBot.bot.name, message };
    }

    update() {
        const now = Date.now();
        if (!this.botsData || this.botsData.length === 0) {
            this.initBots();
        }
        if (now - this.lastMessageTime > this.messageInterval) {
            this.lastMessageTime = now;
            const { botName, message } = this.generateMessage();
            this.game.addChatMessage(botName, message);
        }
    }
}

export default BotConversation;
