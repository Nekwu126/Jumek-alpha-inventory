import express from "express";
import cors from "cors";



const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors({
  origin: [
    "https://jumek-alpha-inventory.vercel.app",
    "https://localhost:3000"
  ],
  methods: "GET,POST,PUT,DELETE",
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));
app.use(express.json());

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/inventory_db';

mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
})
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    console.log('Please check:');
    console.log('1. Your connection string in .env file');
    console.log('2. Network Access is set to 0.0.0.0/0 in MongoDB Atlas');
    console.log('3. Database user credentials are correct');
  });

  // Product Schema
const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  sku: { type: String, required: true, unique: true },
  stock: { type: Number, required: true, default: 0 },
  price: { type: Number, required: true },
  lowStockAlert: { type: Number, required: true, default: 10 },
  createdAt: { type: Date, default: Date.now }
});

// Sale Schema
const saleSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String, required: true },
  productSku: { type: String, required: true },
  quantity: { type: Number, required: true },
  pricePerUnit: { type: Number, required: true },
  totalPrice: { type: Number, required: true },
  remainingStock: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now }
});


const Product = mongoose.model('Product', productSchema);
const Sale = mongoose.model('Sale', saleSchema);

// ==================== PRODUCTS ROUTES ====================

app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching products', error: error.message });
  }
});


app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching product', error: error.message });
  }
});


app.post('/api/products', async (req, res) => {
  try {
    const { name, sku, stock, price, lowStockAlert } = req.body;

    if (!name || !sku || stock === undefined || !price || lowStockAlert === undefined) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const existingProduct = await Product.findOne({ sku });
    if (existingProduct) {
      return res.status(400).json({ message: 'SKU already exists' });
    }



   const product = new Product({
      name,
      sku,
      stock: parseInt(stock),
      price: parseFloat(price),
      lowStockAlert: parseInt(lowStockAlert)
    });
    
     await product.save();
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: 'Error creating product', error: error.message });
  }
});


app.put('/api/products/:id', async (req, res) => {
  try {
    const { name, sku, stock, price, lowStockAlert } = req.body;

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

     if (sku && sku !== product.sku) {
      const existingProduct = await Product.findOne({ sku });
      if (existingProduct) {
        return res.status(400).json({ message: 'SKU already exists' });
      }
    }

    if (name) product.name = name;
    if (sku) product.sku = sku;
    if (stock !== undefined) product.stock = parseInt(stock);
    if (price) product.price = parseFloat(price);
    if (lowStockAlert !== undefined) product.lowStockAlert = parseInt(lowStockAlert);


    await product.save();
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Error updating product', error: error.message });
  }
});


app.delete('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting product', error: error.message });
  }
});


// ==================== SALES ROUTES ====================

app.get('/api/sales', async (req, res) => {
  try {
    const sales = await Sale.find().sort({ timestamp: -1 });
    res.json(sales);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching sales', error: error.message });
  }
});


app.post('/api/sales', async (req, res) => {
  try {
    const { productId, quantity } = req.body;

    if (!productId || !quantity || quantity <= 0) {
      return res.status(400).json({ message: 'Valid product ID and quantity required' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (product.stock < quantity) {
      return res.status(400).json({ 
        message: `Insufficient stock. Available: ${product.stock}, Requested: ${quantity}` 
      });
    }

    product.stock -= quantity;
    await product.save();

     const sale = new Sale({
      productId: product._id,
      productName: product.name,
      productSku: product.sku,
      quantity: parseInt(quantity),
      pricePerUnit: product.price,
      totalPrice: product.price * quantity,
      remainingStock: product.stock
    });

    await sale.save();

    const lowStockAlert = product.stock <= product.lowStockAlert;

    res.json({
      sale,
      product,
      lowStockAlert
    });
  } catch (error) {
    res.status(500).json({ message: 'Error processing sale', error: error.message });
  }
});

// ==================== REPORTS/STATS ROUTES ====================

app.get('/api/reports/inventory-stats', async (req, res) => {
  try {
    const products = await Product.find();
    
    const totalProducts = products.length;
    const totalInventoryValue = products.reduce((sum, p) => sum + (p.stock * p.price), 0);
    const lowStockCount = products.filter(p => p.stock <= p.lowStockAlert).length;


    res.json({
      totalProducts,
      totalInventoryValue,
      lowStockCount
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching stats', error: error.message });
  }
});

app.get('/', (req, res) => {
  res.json({ 
    message: '✅ Inventory & Sales Manager API',
    status: 'Running',
    database: 'MongoDB Atlas',
    endpoints: {
      products: '/api/products',
      sales: '/api/sales',
      stats: '/api/reports/inventory-stats'
    }
  });
});


// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!', error: err.message });
});


// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🍃 Using MongoDB Atlas`);
});