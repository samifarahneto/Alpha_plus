const functions = require("firebase-functions");
const Stripe = require("stripe");
const cors = require("cors");
const admin = require("firebase-admin");
require("dotenv").config();

// Inicialização do Firebase Admin SDK
if (!admin.apps.length) {
    admin.initializeApp();
}

// Configuração do Stripe
const stripe = new Stripe(
    process.env.STRIPE_SECRET_KEY || functions.config().stripe.secret_key,
    {apiVersion: "2022-11-15"},
);

// Middleware de CORS
const corsHandler = cors({origin: true});

/**
 * Cloud Function que gera um ID autoincremental para projetos
 *
 * Esta função:
 * 1. Usa uma transação para garantir operações atômicas
 * 2. Incrementa o contador na coleção 'counters'
 * 3. Retorna o novo valor do contador como ID do projeto
 */
exports.getNextProjectId = functions.https.onCall(async (data, context) => {
    try {
    // Verificar autenticação (opcional, dependendo dos requisitos de segurança)
        if (!context.auth) {
            throw new functions.https.HttpsError(
                "unauthenticated",
                "Usuário deve estar autenticado para obter um ID de projeto.",
            );
        }

        const db = admin.firestore();

        // Referência para o documento contador
        const counterRef = db.collection("counters").doc("projects");

        // Executar uma transação para garantir atomicidade
        const newId = await db.runTransaction(async (transaction) => {
            const counterDoc = await transaction.get(counterRef);

            // Se o documento não existir, crie-o com valor inicial 1
            if (!counterDoc.exists) {
                transaction.set(counterRef, {current: 1});
                return 1;
            }

            // Caso contrário, incremente o valor atual
            const currentValue = counterDoc.data().current;
            const nextValue = currentValue + 1;

            transaction.update(counterRef, {current: nextValue});

            return nextValue;
        });

        // Registrar o ID gerado para fins de depuração
        console.log(`Novo ID de projeto gerado: ${newId}`);

        // Retornar o novo ID
        return {projectId: newId};
    } catch (error) {
        console.error("Erro ao gerar ID de projeto:", error);
        throw new functions.https.HttpsError(
            "internal",
            `Erro ao gerar ID: ${error.message}`,
        );
    }
});

// Função do Stripe: Criar Payment Intent
exports.createPaymentIntent = functions.https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
        if (req.method !== "POST") {
            return res.status(405).send({error: "Método não permitido"});
        }

        try {
            console.log("Recebendo requisição:", req.body); // Log para debug

            const {amount, currency, project_id} = req.body;

            if (!amount || !currency) {
                return res
                    .status(400)
                    .send({error: "Amount e currency são obrigatórios"});
            }

            const paymentIntentData = {
                amount: parseInt(amount),
                currency,
            };

            // Adiciona metadata apenas se project_id estiver presente
            if (project_id) {
                paymentIntentData.metadata = {project_id};
            }

            console.log("Criando PaymentIntent com:", paymentIntentData); // Log para debug

            const paymentIntent = await stripe.paymentIntents.create(
                paymentIntentData,
            );

            console.log("PaymentIntent criado:", paymentIntent.id); // Log para debug

            res.status(200).send({
                clientSecret: paymentIntent.client_secret,
                paymentIntentId: paymentIntent.id,
            });
        } catch (error) {
            console.error("Erro ao criar intenção de pagamento:", error);
            res.status(500).send({error: error.message});
        }
    });
});

// Adicionado: Webhook do Stripe
exports.stripeWebhook = functions.https.onRequest((req, res) => {
    const sig = req.headers["stripe-signature"];
    const endpointSecret = functions.config().stripe.webhook_secret; // Adicionado webhook_secret no config

    let event;

    try {
    // Verificar a assinatura do evento
        event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
    } catch (err) {
        console.error("Erro ao verificar webhook:", err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Processar evento específico
    if (event.type === "payment_intent.succeeded") {
        const paymentIntent = event.data.object;

        // Recuperar o ID do projeto dos metadados
        const projectId = paymentIntent.metadata.project_id;

        if (projectId) {
            const firestore = admin.firestore();

            firestore
                .collection("projects")
                .doc(projectId)
                .update({
                    isPaid: true,
                    status: "Pago",
                })
                .then(() => {
                    console.log(`Status do projeto ${projectId} atualizado para "Pago".`);
                })
                .catch((error) => {
                    console.error(
                        "Erro ao atualizar o status do projeto:",
                        error.message,
                    );
                });
        }
    }

    res.status(200).send("Evento processado");
});
