const User = require('../models/User');
const Category = require('../models/Category');
const Product = require('../models/Product');
const PRODUCTS = require('../config/products');
const { hashPassword } = require('../helpers/cryptoHelpers');

async function seedDefaultUsers() {
  try {
    const agentExists = await User.findOne({ username: 'agent' });
    if (!agentExists) {
      const hashedPassword = await hashPassword('agent123');
      await User.create({
        username: 'agent',
        password: hashedPassword,
        fullName: 'System Agent',
        email: 'agent@tapandpay.rw',
        role: 'agent',
        passwordSet: true,
        forcePasswordChange: true
      });
      console.log('Default agent user created (username: agent, password: agent123)');
      console.log('⚠️  Agent must change password on first login');
    } else if (!agentExists.passwordSet) {
      // Fix existing agent that may not have passwordSet flag
      agentExists.passwordSet = true;
      agentExists.forcePasswordChange = true;
      await agentExists.save();
    }
    
    // Seed Categories and Products
    await seedProductsAndCategories();
    
  } catch (err) {
    console.error('Error seeding data:', err);
  }
}

async function seedProductsAndCategories() {
  try {
    // Specifically remove legacy categories and their products
    const slugsToRemove = ['domains', 'services'];
    for (const slug of slugsToRemove) {
      const cat = await Category.findOne({ slug });
      if (cat) {
        console.log(`Removing legacy category: ${cat.name}`);
        await Product.deleteMany({ category: cat._id });
        await Category.findByIdAndDelete(cat._id);
      }
    }

    // Purge any remaining products by name pattern (case-insensitive)
    const purgeRegex = /domain|email/i;
    const purged = await Product.deleteMany({ name: { $regex: purgeRegex } });
    if (purged.deletedCount > 0) {
      console.log(`Purged ${purged.deletedCount} legacy products by name pattern.`);
    }

    const categoryCount = await Category.countDocuments();
    if (categoryCount === 0) {
      console.log('Seeding initial categories and products...');
      
      const categoriesMap = {
        'food': { name: 'Food & Beverages', slug: 'food', icon: '🍔' },
        'rwandan': { name: 'Rwandan Local Foods', slug: 'rwandan', icon: '🇷🇼' },
        'drinks': { name: 'Snacks & Drinks', slug: 'drinks', icon: '🥤' }
      };

      const createdCategories = {};
      for (const [key, catData] of Object.entries(categoriesMap)) {
        const category = await Category.create(catData);
        createdCategories[key] = category._id;
      }

      for (const productData of PRODUCTS) {
        await Product.create({
          name: productData.name,
          price: productData.price,
          icon: productData.icon,
          category: createdCategories[productData.category],
          stock: 100, // Initial stock for all seeded products
          isActive: true
        });
      }
      console.log('Successfully seeded categories and products.');
    }
  } catch (err) {
    console.error('Error seeding products:', err);
  }
}

module.exports = { seedDefaultUsers };

