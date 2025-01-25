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
    console.log('Secret retrieved successfully');
    return secret.value || '';
  } catch (error) {
    console.error(`Error retrieving secret "${secretName}":`, error);
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
    res.status(200).json({ message: 'Welcome!', visitCount: visit?.count });
  } catch (error) {
    console.error('Error incrementing visit count:', error);
    res.status(500).json({ message: 'Error incrementing visit count', error: error.message });
  }
});

// Conectar ao MongoDB
async function connectToDatabase() {
  try {
    const connectionString = "mongodb+srv://test:E1wUVYFLtGwqyWhh@cluster0.cvi3n.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
    console.log('Connecting to MongoDB...');
    await mongoose.connect(connectionString, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
  }
}

// Iniciar o servidor
app.listen(PORT, async () => {
  try {
    await connectToDatabase();
    console.log(`Server is running on http://localhost:${PORT}`);
  } catch (error) {
    console.error('Error starting the server:', error);
  }
});
