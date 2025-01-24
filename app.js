const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const { DefaultAzureCredential } = require('@azure/identity');
const { SecretClient } = require('@azure/keyvault-secrets');

const app = express();
const port = process.env.PORT || 3000;

// Configuração do Azure Key Vault
const keyVaultUrl = 'https://celfons.vault.azure.net'; // URL do Key Vault
const secretName = 'MongoDBConnectionString'; // Nome do segredo com a string de conexão

// Configuração do MongoDB
let db;

// Função para configurar a conexão com o MongoDB Atlas
(async () => {
  try {
    console.log('Connecting to Azure Key Vault...');
    const credential = new DefaultAzureCredential();
    const secretClient = new SecretClient(keyVaultUrl, credential);

    // Obtém o segredo do Key Vault
    const secret = await secretClient.getSecret(secretName);
    const mongoUrl = secret.value;

    console.log('Connecting to MongoDB Atlas...');
    const mongoClient = new MongoClient(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true });
    await mongoClient.connect();
    console.log('Connected to MongoDB Atlas');

    // Configura o banco de dados (substitua "testdb" pelo nome do seu database)
    db = mongoClient.db('testdb');

    // Inicializa o contador de visitas se não existir
    const existingCounter = await db.collection('visits').findOne({ name: 'rootCounter' });
    if (!existingCounter) {
      await db.collection('visits').insertOne({ name: 'rootCounter', count: 0 });
      console.log('Counter initialized');
    }
  } catch (error) {
    console.error('Error setting up MongoDB connection:', error.message);
    process.exit(1);
  }
})();

// Middleware para JSON
app.use(express.json());

// Rota principal com contador de visitas
app.get('/', async (req, res) => {
  try {
    // Incrementa o contador
    const result = await db.collection('visits').findOneAndUpdate(
      { name: 'rootCounter' },
      { $inc: { count: 1 } }, // Incrementa o campo "count" em 1
      { returnDocument: 'after' } // Retorna o documento atualizado
    );

    const currentCount = result.value?.count || 0;

    res.send(`Hello, World! Este endpoint foi visitado ${currentCount} vezes.`);
  } catch (error) {
    console.error('Error updating visit count:', error.message);
    res.status(500).send(error.message);
  }
});

// Rotas CRUD
app.post('/users', async (req, res) => {
  const user = req.body;
  try {
    const result = await db.collection('users').insertOne(user);
    res.status(201).send({ message: 'User created', id: result.insertedId });
  } catch (err) {
    res.status(500).send({ error: 'Failed to create user', details: err.message });
  }
});

app.get('/users', async (req, res) => {
  try {
    const users = await db.collection('users').find().toArray();
    res.status(200).send(users);
  } catch (err) {
    res.status(500).send({ error: 'Failed to fetch users', details: err.message });
  }
});

app.get('/users/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const user = await db.collection('users').findOne({ _id: new ObjectId(id) });
    if (!user) {
      return res.status(404).send({ error: 'User not found' });
    }
    res.status(200).send(user);
  } catch (err) {
    res.status(500).send({ error: 'Failed to fetch user', details: err.message });
  }
});

app.put('/users/:id', async (req, res) => {
  const id = req.params.id;
  const updates = req.body;
  try {
    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(id) },
      { $set: updates }
    );
    if (result.matchedCount === 0) {
      return res.status(404).send({ error: 'User not found' });
    }
    res.status(200).send({ message: 'User updated' });
  } catch (err) {
    res.status(500).send({ error: 'Failed to update user', details: err.message });
  }
});

app.delete('/users/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const result = await db.collection('users').deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
      return res.status(404).send({ error: 'User not found' });
    }
    res.status(200).send({ message: 'User deleted' });
  } catch (err) {
    res.status(500).send({ error: 'Failed to delete user', details: err.message });
  }
});

// Inicializa o servidor
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});