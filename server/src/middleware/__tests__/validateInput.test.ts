import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { validateBody, validateQuery, validateParams } from '../validateInput.js'

describe('Input Validation Middleware', () => {
  let mockReq: Partial<Request>
  let mockRes: Partial<Response>
  let mockNext: NextFunction
  let jsonMock: ReturnType<typeof vi.fn>
  let statusMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    jsonMock = vi.fn()
    statusMock = vi.fn().mockReturnValue({ json: jsonMock })

    mockReq = {
      body: {},
      query: {},
      params: {},
    }
    mockRes = {
      status: statusMock,
      json: jsonMock,
    }
    mockNext = vi.fn()
  })

  describe('validateBody', () => {
    const schema = z.object({
      name: z.string().min(1),
      age: z.number().min(0).optional(),
    })

    it('should pass valid input', () => {
      mockReq.body = { name: 'John', age: 30 }

      const middleware = validateBody(schema)
      middleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalled()
      expect(mockReq.body).toEqual({ name: 'John', age: 30 })
    })

    it('should pass partial valid input', () => {
      mockReq.body = { name: 'John' }

      const middleware = validateBody(schema)
      middleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalled()
    })

    it('should reject missing required field', () => {
      mockReq.body = { age: 30 }

      const middleware = validateBody(schema)
      middleware(mockReq as Request, mockRes as Response, mockNext)

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Validation failed',
          details: expect.arrayContaining([
            expect.objectContaining({ path: 'name' }),
          ]),
        })
      )
    })

    it('should reject invalid type', () => {
      mockReq.body = { name: 123 }

      const middleware = validateBody(schema)
      middleware(mockReq as Request, mockRes as Response, mockNext)

      expect(statusMock).toHaveBeenCalledWith(400)
    })

    it('should reject constraint violation', () => {
      mockReq.body = { name: 'John', age: -5 }

      const middleware = validateBody(schema)
      middleware(mockReq as Request, mockRes as Response, mockNext)

      expect(statusMock).toHaveBeenCalledWith(400)
    })
  })

  describe('validateQuery', () => {
    const schema = z.object({
      page: z.coerce.number().min(1).default(1),
      limit: z.coerce.number().min(1).max(100).default(20),
      search: z.string().optional(),
    })

    it('should pass valid query', () => {
      mockReq.query = { page: '2', limit: '50', search: 'test' }

      const middleware = validateQuery(schema)
      middleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalled()
      expect(mockReq.query).toEqual({ page: 2, limit: 50, search: 'test' })
    })

    it('should apply defaults', () => {
      mockReq.query = {}

      const middleware = validateQuery(schema)
      middleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalled()
      expect(mockReq.query).toEqual({ page: 1, limit: 20 })
    })

    it('should reject invalid query', () => {
      mockReq.query = { page: '-1' }

      const middleware = validateQuery(schema)
      middleware(mockReq as Request, mockRes as Response, mockNext)

      expect(statusMock).toHaveBeenCalledWith(400)
    })
  })

  describe('validateParams', () => {
    const schema = z.object({
      id: z.string().uuid(),
    })

    it('should pass valid params', () => {
      mockReq.params = { id: '550e8400-e29b-41d4-a716-446655440000' }

      const middleware = validateParams(schema)
      middleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalled()
    })

    it('should reject invalid UUID', () => {
      mockReq.params = { id: 'not-a-uuid' }

      const middleware = validateParams(schema)
      middleware(mockReq as Request, mockRes as Response, mockNext)

      expect(statusMock).toHaveBeenCalledWith(400)
    })
  })
})
