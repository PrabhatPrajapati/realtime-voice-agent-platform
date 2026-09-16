import request from 'supertest';
import { jest } from '@jest/globals';
import app from '../src/app.js';
import { callRepository } from '../src/repositories/callRepository.js';
import { customerRepository } from '../src/repositories/customerRepository.js';
import { campaignRepository } from '../src/repositories/campaignRepository.js';
import { issueRepository } from '../src/repositories/issueRepository.js';

describe('AI Calling Agent Comprehensive Integration & Unit Tests', () => {
  beforeAll(() => {
    // Mock repositories to isolate tests from live DB connections during test runs
    jest.spyOn(callRepository, 'findByTwilioCallSid').mockImplementation(async (callSid) => {
      if (callSid === 'CAmock_existing') {
        return {
          id: '66e01234567890abcdef1234',
          twilioCallSid: 'CAmock_existing',
          status: 'DIALING',
          outcome: 'IN_PROGRESS',
          answeredAt: null,
        };
      }
      return null;
    });

    jest.spyOn(callRepository, 'create').mockImplementation(async (data) => ({
      id: '66e01234567890abcdef1234',
      ...data,
      createdAt: new Date(),
    }));

    jest.spyOn(callRepository, 'update').mockImplementation(async (id, data) => ({
      id,
      ...data,
    }));

    jest.spyOn(customerRepository, 'findById').mockImplementation(async (id) => ({
      id,
      name: 'Test Customer',
      phone: '+15551234567',
      status: 'ACTIVE',
      assignedCsrId: 'CSR-001',
    }));

    jest.spyOn(customerRepository, 'upsertByPhone').mockImplementation(async (data) => ({
      id: '66e01234567890abcdef9999',
      ...data,
      status: 'ACTIVE',
    }));

    jest.spyOn(campaignRepository, 'create').mockImplementation(async (data) => ({
      id: '66e01234567890abcdef7777',
      name: data.name,
      description: data.description,
      concurrency: data.concurrency,
      status: 'DRAFT',
      totalCustomers: data.customerIds?.length || 0,
      completedCalls: 0,
      campaignCustomers: [],
    }));

    jest.spyOn(issueRepository, 'create').mockImplementation(async (data) => ({
      id: '66e01234567890abcdef8888',
      ...data,
      status: 'OPEN',
      createdAt: new Date(),
    }));

    jest.spyOn(issueRepository, 'findById').mockImplementation(async (id) => ({
      id,
      customerId: '66e01234567890abcdef9999',
      summary: 'Test summary',
      category: 'LOGIN',
      priority: 'MEDIUM',
      status: 'OPEN',
      assignedCsrId: 'CSR-001',
    }));

    jest.spyOn(issueRepository, 'update').mockImplementation(async (id, data) => ({
      id,
      status: data.status || 'RESOLVED',
    }));
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('1. Health & Stats APIs', () => {
    it('GET /api/health returns 200 and healthy status', async () => {
      const response = await request(app).get('/api/health');
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });

    it('GET /api/stats returns aggregated metrics', async () => {
      const response = await request(app).get('/api/stats');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalCustomers');
      expect(response.body.data).toHaveProperty('callsToday');
    });
  });

  describe('2. Twilio Webhook Handlers', () => {
    it('POST /webhooks/twilio/voice returns TwiML with Media Stream connector', async () => {
      const response = await request(app)
        .post('/webhooks/twilio/voice?callId=test-call-123&customerId=test-cust-456')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send({
          CallSid: 'CA1234567890abcdef',
          From: '+15551234567',
          To: '+15559876543',
        });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/text\/xml/);
      expect(response.text).toContain('<Response>');
      expect(response.text).toContain('<Connect>');
      expect(response.text).toContain('<Stream url=');
      expect(response.text).toContain('/media-stream');
    });

    it('POST /webhooks/twilio/transfer returns valid CSR Dial TwiML', async () => {
      const response = await request(app)
        .post('/webhooks/twilio/transfer')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send({
          CallSid: 'CA1234567890abcdef',
        });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/text\/xml/);
      expect(response.text).toContain('<Dial');
    });

    it('POST /webhooks/twilio/status processes status callbacks', async () => {
      const response = await request(app)
        .post('/webhooks/twilio/status')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send({
          CallSid: 'CAmock_existing',
          CallStatus: 'completed',
          CallDuration: '45',
        });

      expect(response.status).toBe(200);
    });
  });

  describe('3. Outbound Calls API', () => {
    it('POST /api/calls/test successfully initiates a call', async () => {
      const response = await request(app)
        .post('/api/calls/test')
        .send({
          phone: '+15551234567',
          customerName: 'Alice Johnson',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.status).toBe('DIALING');
    });

    it('POST /api/calls/test rejects invalid phone numbers', async () => {
      const response = await request(app)
        .post('/api/calls/test')
        .send({
          phone: '12345-invalid',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('4. Issue Management API', () => {
    it('POST /api/issues creates a structured issue', async () => {
      const response = await request(app)
        .post('/api/issues')
        .send({
          customerId: '66e01234567890abcdef9999',
          summary: 'Unable to login to account',
          category: 'LOGIN',
          priority: 'HIGH',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.summary).toBe('Unable to login to account');
    });

    it('POST /api/issues/:id/resolve resolves an open issue', async () => {
      const response = await request(app)
        .post('/api/issues/66e01234567890abcdef8888/resolve')
        .send({
          notes: 'Customer password reset link sent',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('RESOLVED');
    });
  });

  describe('5. Campaign API', () => {
    it('POST /api/campaigns creates a new campaign', async () => {
      const response = await request(app)
        .post('/api/campaigns')
        .send({
          name: 'Q4 Customer Check-in',
          description: 'Outbound voice campaign',
          concurrency: 3,
          customerIds: ['66e01234567890abcdef9999'],
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Q4 Customer Check-in');
    });
  });
});
