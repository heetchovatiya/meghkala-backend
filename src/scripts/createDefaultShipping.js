// scripts/createDefaultShipping.js
const mongoose = require('mongoose');
const Shipping = require('../models/shipping.model.js');

const createDefaultShipping = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/meghkala');
    
    // Check if default shipping already exists
    const existingDefault = await Shipping.findOne({ isDefault: true });
    if (existingDefault) {
      console.log('Default shipping method already exists');
      return;
    }

    // Create default shipping method
    const defaultShipping = new Shipping({
      name: 'Standard Shipping',
      description: 'Standard delivery within 5-7 business days',
      basePrice: 100,
      freeShippingThreshold: 2000,
      isActive: true,
      estimatedDays: {
        min: 5,
        max: 7
      },
      countries: ['IN', 'US', 'CA', 'GB', 'AU'],
      isDefault: true
    });

    await defaultShipping.save();
    console.log('Default shipping method created successfully');
  } catch (error) {
    console.error('Error creating default shipping method:', error);
  } finally {
    await mongoose.disconnect();
  }
};

createDefaultShipping();