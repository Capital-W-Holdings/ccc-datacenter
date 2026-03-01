/**
 * Test fixtures for prospects
 */

export const mockProspect = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  full_name: 'John Smith',
  title: 'CEO',
  company: 'DataCenter Corp',
  company_type: 'Owner/Operator',
  email: 'john.smith@datacenter.com',
  phone: '+1-555-0100',
  linkedin_url: 'https://linkedin.com/in/johnsmith',
  ccc_verticals: ['Private Equity'],
  target_roles: ['Owner/Investor'],
  relevance_score: 85,
  status: 'New',
  source_url: 'https://example.com/speakers',
  source_type: 'conference_speaker',
  ai_summary: 'Experienced data center executive with 20 years in the industry.',
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
}

export const mockProspects = [
  mockProspect,
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    full_name: 'Jane Doe',
    title: 'VP of Operations',
    company: 'CloudScale Inc',
    company_type: 'Hyperscaler',
    email: 'jane.doe@cloudscale.com',
    phone: '+1-555-0101',
    linkedin_url: 'https://linkedin.com/in/janedoe',
    ccc_verticals: ['Investment Banking'],
    target_roles: ['Operator'],
    relevance_score: 92,
    status: 'Researching',
    source_url: 'https://example.com/team',
    source_type: 'company_leadership',
    ai_summary: null,
    created_at: '2024-01-14T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    full_name: 'Bob Johnson',
    title: 'Director of Engineering',
    company: 'TechInfra LLC',
    company_type: 'Contractor/Builder',
    email: 'bob.j@techinfra.com',
    phone: null,
    linkedin_url: null,
    ccc_verticals: ['Infrastructure Provider'],
    target_roles: ['Builder'],
    relevance_score: 65,
    status: 'Enriched',
    source_url: 'https://example.com/news/article',
    source_type: 'news_mention',
    ai_summary: 'Technical leader in data center infrastructure.',
    created_at: '2024-01-13T10:00:00Z',
    updated_at: '2024-01-15T12:00:00Z',
  },
]

export const createProspectInput = {
  full_name: 'Test User',
  title: 'CTO',
  company: 'Test Company',
  email: 'test@example.com',
}

export const invalidProspectInputs = {
  missingName: {
    title: 'CEO',
    company: 'Test Company',
  },
  emptyName: {
    full_name: '',
    title: 'CEO',
  },
  invalidEmail: {
    full_name: 'Test User',
    email: 'not-an-email',
  },
  invalidScore: {
    full_name: 'Test User',
    relevance_score: 150, // Over 100
  },
}
