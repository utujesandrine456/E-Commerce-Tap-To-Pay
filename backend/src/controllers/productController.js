const mongoose = require('mongoose');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Reservation = require('../models/Reservation');

// Categories
exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};

exports.addCategory = async (req, res) => {
  try {
    const { name, icon } = req.body;
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const category = await Category.create({ name, slug, icon });
    res.status(201).json(category);
  } catch (err) {
    res.status(400).json({ error: 'Failed to create category. Name might already exist.' });
  }
};

// Products
exports.getProducts = async (req, res) => {
  try {
    const products = await Product.find().populate('category').sort({ name: 1 });
    
    // Get all active reservations
    const reservations = await Reservation.aggregate([
      { $group: { _id: "$productId", totalReserved: { $sum: "$quantity" } } }
    ]);
    
    const resMap = {};
    reservations.forEach(r => resMap[r._id.toString()] = r.totalReserved);
    
    // Supplement product data with available stock
    const productsWithAvailable = products.map(p => {
      const pObj = p.toObject();
      const reserved = resMap[p._id.toString()] || 0;
      pObj.availableStock = Math.max(0, p.stock - reserved);
      pObj.isReserved = reserved > 0;
      return pObj;
    });

    res.json(productsWithAvailable);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
};

exports.reserveProducts = async (req, res) => {
  const { items, sessionId } = req.body;
  if (!items || !items.length || !sessionId) {
    return res.status(400).json({ error: 'Items and sessionId required' });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes locking

    for (const item of items) {
      const product = await Product.findById(item.productId).session(session);
      if (!product) throw new Error(`Product not found: ${item.productId}`);

      // Calculate available stock
      const existingReservations = await Reservation.aggregate([
        { $match: { productId: product._id } },
        { $group: { _id: null, total: { $sum: "$quantity" } } }
      ]).session(session);

      const reservedQty = existingReservations.length > 0 ? existingReservations[0].total : 0;
      const available = product.stock - reservedQty;

      if (available < item.qty) {
        throw new Error(`Insufficient available stock for ${product.name}. Requested: ${item.qty}, Available: ${available}`);
      }

      await Reservation.create([{
        productId: product._id,
        quantity: item.qty,
        sessionId,
        expiresAt
      }], { session });
    }

    await session.commitTransaction();
    res.json({ success: true, message: 'Stock reserved for 5 minutes', expiresAt });
  } catch (err) {
    await session.abortTransaction();
    res.status(400).json({ error: err.message });
  } finally {
    session.endSession();
  }
};

exports.addProduct = async (req, res) => {
  try {
    const { name, price, icon, categoryId, stock } = req.body;
    const product = await Product.create({
      name,
      price,
      icon,
      category: categoryId,
      stock: stock || 0
    });
    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ error: 'Failed to create product' });
  }
};

exports.updateStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount } = req.body; // New absolute stock amount
    
    const product = await Product.findByIdAndUpdate(
      id,
      { stock: amount },
      { new: true }
    ).populate('category');
    
    if (!product) return res.status(404).json({ error: 'Product not found' });
    
    res.json(product);
  } catch (err) {
    res.status(400).json({ error: 'Failed to update stock' });
  }
};

exports.addStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body; // increment
    
    const product = await Product.findByIdAndUpdate(
      id,
      { $inc: { stock: quantity } },
      { new: true }
    ).populate('category');
    
    if (!product) return res.status(404).json({ error: 'Product not found' });
    
    res.json(product);
  } catch (err) {
    res.status(400).json({ error: 'Failed to add stock' });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, icon, categoryId, stock, isActive } = req.body;
    
    const updateData = {};
    if (name) updateData.name = name;
    if (price !== undefined) updateData.price = price;
    if (icon) updateData.icon = icon;
    if (categoryId) updateData.category = categoryId;
    if (stock !== undefined) updateData.stock = stock;
    if (isActive !== undefined) updateData.isActive = isActive;

    const product = await Product.findByIdAndUpdate(id, updateData, { new: true }).populate('category');
    if (!product) return res.status(404).json({ error: 'Product not found' });
    
    res.json(product);
  } catch (err) {
    res.status(400).json({ error: 'Failed to update product' });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findByIdAndDelete(id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ success: true, message: 'Product deleted' });
  } catch (err) {
    res.status(400).json({ error: 'Failed to delete product' });
  }
};
