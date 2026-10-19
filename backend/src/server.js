const { createApp } = require('./app');

const PORT = Number(process.env.PORT) || 3000;
const server = createApp();

server.listen(PORT, () => {
  console.log(`VisuLex backend ouvindo na porta ${PORT}`);
});

// Encerramento limpo quando o Docker para o contêiner (docker compose down).
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    console.log(`Recebido ${signal}, encerrando...`);
    server.close(() => process.exit(0));
  });
}
