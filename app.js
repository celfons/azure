const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { SecretClient } = require('@azure/keyvault-secrets');
const { DefaultAzureCredential } = require('@azure/identity');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// Modelo para armazenar visitas no MongoDB
const visitSchema = new mongoose.Schema({
  count: { type: Number, required: true, default: 0 },
});
const Visit = mongoose.model('Visit', visitSchema);

// Função para buscar a connection string no Azure Key Vault
async function getSecret(secretName, keyVaultUrl) {
  try {
    const credential = new DefaultAzureCredential();
    const client = new SecretClient(keyVaultUrl, credential);

    console.log(`Fetching secret: ${secretName}`);
    const secret = await client.getSecret(secretName);
    if (!secret.value) throw new Error(`Secret "${secretName}" is empty`);
    console.log('Secret retrieved successfully');
    return secret.value;
  } catch (error) {
    console.error(`Error retrieving secret "${secretName}":`, error);
    throw error; // Lança o erro para tratamento
  }
}

// Rota principal que incrementa e retorna o contador de visitas
app.get('/', async (req, res) => {
  try {
    const visit = await Visit.findOneAndUpdate(
      {}, 
      { $inc: { count: 1 } }, 
      { upsert: true, new: true }
    );
    console.log(`Visit count incremented to: ${visit.count}`);
    res.status(200).json({ message: 'Welcome!', visitCount: visit.count });
  } catch (error) {
    console.error('Error incrementing visit count:', error);
    res.status(500).json({ message: 'Error incrementing visit count', error: error.message });
  }
});

// Conectar ao MongoDB
async function connectToDatabase() {
  try {
    const connectionString = await getSecret(
      'MongoDBConnectionString', 
      'https://celfons.vault.azure.net/'
    );
    console.log('Connecting to MongoDB...');
    await mongoose.connect(connectionString, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    throw error;
  }
}

// Listener para encerrar a conexão ao MongoDB
process.on('SIGINT', async () => {
  console.log('Closing MongoDB connection...');
  await mongoose.connection.close();
  console.log('MongoDB connection closed');
  process.exit(0);
});

// Iniciar o servidor
app.listen(PORT, async () => {
  try {
    await connectToDatabase();
    console.log(`Server is running on http://localhost:${PORT}`);
  } catch (error) {
    console.error('Error starting the server:', error);
  }
});
