import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Request, Response, NextFunction } from 'express'
import { authMiddleware, publicEndpoints, optionalAuth } from '../auth.js'

// Mock the environment
const originalEnv = process.env

describe('Auth Middleware', () => {
  let mockReq: Partial<Request>
  let mockRes: Partial<Response>
  let mockNext: NextFunction
  let jsonMock: ReturnType<typeof vi.fn>
  let statusMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    process.env = { ...originalEnv, APP_SECRET: 'test-secret' }

    jsonMock = vi.fn()
    statusMock = vi.fn().mockReturnValue({ json: jsonMock })

    mockReq = {
      headers: {},
      query: {},
      path: '/api/prospects',
    }
    mockRes = {
      status: statusMock,
      json: jsonMock,
    }
    mockNext = vi.fn()
  })

  describe('authMiddleware', () => {
    it('should allow request with valid Bearer token', () => {
      mockReq.headers = { authorization: 'Bearer test-secret' }

      authMiddleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalled()
      expect(statusMock).not.toHaveBeenCalled()
    })

    it('should allow request with valid x-api-key header', () => {
      mockReq.headers = { 'x-api-key': 'test-secret' }

      authMiddleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalled()
      expect(statusMock).not.toHaveBeenCalled()
    })

    it('should allow request with valid api_key query parameter', () => {
      mockReq.query = { api_key: 'test-secret' }

      authMiddleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalled()
      expect(statusMock).not.toHaveBeenCalled()
    })

    it('should reject request with invalid token', () => {
      mockReq.headers = { authorization: 'Bearer wrong-secret' }

      authMiddleware(mockReq as Request, mockRes as Response, mockNext)

      expect(statusMock).toHaveBeenCalledWith(401)
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Unauthorized - Invalid or missing API key',
      })
    })

    it('should reject request with no auth', () => {
      authMiddleware(mockReq as Request, mockRes as Response, mockNext)

      expect(statusMock).toHaveBeenCalledWith(401)
    })

    it('should skip auth when APP_SECRET is not set', () => {
      process.env.APP_SECRET = ''

      authMiddleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalled()
    })
  })

  describe('publicEndpoints', () => {
    it('should skip auth for /api/health', () => {
      mockReq.path = '/api/health'

      publicEndpoints(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith('route')
    })

    it('should skip auth for /health', () => {
      mockReq.path = '/health'

      publicEndpoints(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith('route')
    })

    it('should require auth for other paths', () => {
      mockReq.path = '/api/prospects'

      publicEndpoints(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith()
    })
  })

  describe('optionalAuth', () => {
    it('should mark request as authenticated with valid token', () => {
      mockReq.headers = { authorization: 'Bearer test-secret' }

      optionalAuth(mockReq as Request, mockRes as Response, mockNext)

      expect((mockReq as Request & { isAuthenticated: boolean }).isAuthenticated).toBe(true)
      expect(mockNext).toHaveBeenCalled()
    })

    it('should mark request as not authenticated without token', () => {
      optionalAuth(mockReq as Request, mockRes as Response, mockNext)

      expect((mockReq as Request & { isAuthenticated: boolean }).isAuthenticated).toBe(false)
      expect(mockNext).toHaveBeenCalled()
    })

    it('should mark request as authenticated with valid x-api-key', () => {
      mockReq.headers = { 'x-api-key': 'test-secret' }

      optionalAuth(mockReq as Request, mockRes as Response, mockNext)

      expect((mockReq as Request & { isAuthenticated: boolean }).isAuthenticated).toBe(true)
    })
  })
})
