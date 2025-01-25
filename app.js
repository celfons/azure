const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { SecretClient } = require('@azure/keyvault-secrets');
const { DefaultAzureCredential } = require('@azure/identity');

dotenv.config();

const app = express();
const PORT = 8080;

// Modelo para armazenar visitas no MongoDB
const visitSchema = new mongoose.Schema({
  count: { type: Number, required: true, default: 0 },
});
const Visit = mongoose.model('Visit', visitSchema);

// Função para buscar a connection string no Azure Key Vault
async function getSecret(secretName, keyVaultUrl) {
  const credential = new DefaultAzureCredential();
  const client = new SecretClient(keyVaultUrl, credential);

  const secret = await client.getSecret(secretName);
  return secret.value || '';
}

// Rota principal que incrementa e retorna o contador de visitas
app.get('/', async (req, res) => {
  try {
    const visit = await Visit.findOneAndUpdate(
      {}, 
      { $inc: { count: 1 } }, 
      { upsert: true, new: true }
    );
    res.status(200).json({ message: 'Welcome!', visitCount: visit?.count });
  } catch (error) {
    console.error('Error incrementing visit count:', error);
    res.status(500).json({ message: 'Error incrementing visit count', error: error });
  }
});

// Conectar ao MongoDB
async function connectToDatabase() {
  try {
    const connectionString = await getSecret("MongoDBConnectionString",  "https://celfons.vault.azure.net/");
    await mongoose.connect(connectionString, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
}

// Iniciar o servidor
app.listen(PORT, async () => {
  await connectToDatabase();
  console.log(`Server is running on http://localhost:${PORT}`);
});
