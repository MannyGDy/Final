const radius = require('radius');
const { promisify } = require('util');

class RadiusClient {
  constructor() {
    this.host = process.env.RADIUS_HOST || 'localhost';
    this.port = process.env.RADIUS_PORT || 1812;
    this.secret = process.env.RADIUS_SECRET || 'testing123';
    
    // Promisify radius methods
    this.authenticate = promisify(radius.authenticate);
  }

  async authenticateUser(username, password) {
    try {
      const result = await this.authenticate({
        host: this.host,
        port: this.port,
        secret: this.secret,
        username: username,
        password: password,
        timeout: 5000
      });

      return {
        success: true,
        message: 'RADIUS authentication successful',
        data: result
      };
    } catch (error) {
      console.error('RADIUS authentication error:', error);
      return {
        success: false,
        message: 'RADIUS authentication failed',
        error: error.message
      };
    }
  }

  // Test RADIUS connection
  async testConnection() {
    try {
      const result = await this.authenticateUser('test', 'test');
      console.log('✅ RADIUS server connection test:', result.success ? 'SUCCESS' : 'FAILED');
      return result.success;
    } catch (error) {
      console.error('❌ RADIUS connection test failed:', error);
      return false;
    }
  }
}

module.exports = new RadiusClient();
