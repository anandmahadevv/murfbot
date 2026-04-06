import unittest
import json
from app import app

class TestVoxAIBase(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True

    def test_health_check(self):
        """Test that health endpoint returns 200 OK"""
        response = self.app.get('/api/health')
        data = json.loads(response.get_data(as_text=True))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data['status'], 'ok')
        self.assertIn('uptime', data)

    def test_config_endpoint(self):
        """Test that config endpoint returns correct structure"""
        response = self.app.get('/api/config')
        data = json.loads(response.get_data(as_text=True))
        self.assertEqual(response.status_code, 200)
        self.assertIn('apiKeyConfigured', data)

    def test_voices_fallback(self):
        """Test voices endpoint returns something even without key"""
        response = self.app.get('/api/voices')
        data = json.loads(response.get_data(as_text=True))
        self.assertEqual(response.status_code, 200)
        self.assertIn('voices', data)
        self.assertGreater(len(data['voices']), 0)

if __name__ == '__main__':
    unittest.main()
