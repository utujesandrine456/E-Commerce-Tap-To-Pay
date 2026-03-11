const User = require('../models/User');
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
  } catch (err) {
    console.error('Error seeding users:', err);
  }
}

module.exports = { seedDefaultUsers };
