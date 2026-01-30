import { supabase } from './supabase';
import { User, Session, Message, BusinessProfile, Document, ComplianceResult } from '../types';
import logger from '../utils/logger';

// Helper to check if Supabase is available
function requireSupabase() {
  if (!supabase) {
    throw new Error('Database not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
  }
  return supabase;
}

/**
 * User Database Operations
 */
export class UserRepository {
  async createUser(userData: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> {
    const db = requireSupabase();
    const { data, error } = await db
      .from('users')
      .insert([userData])
      .select()
      .single();

    if (error) {
      logger.error('Error creating user', { error });
      throw new Error('Failed to create user');
    }

    return data as User;
  }

  async getUserById(userId: string): Promise<User | null> {
    const db = requireSupabase();
    const { data, error } = await db
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error('Error fetching user', { error });
      throw new Error('Failed to fetch user');
    }

    return data as User | null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const db = requireSupabase();
    const { data, error } = await db
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error('Error fetching user by email', { error });
      throw new Error('Failed to fetch user');
    }

    return data as User | null;
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    const db = requireSupabase();
    const { data, error } = await db
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      logger.error('Error updating user', { error });
      throw new Error('Failed to update user');
    }

    return data as User;
  }
}

/**
 * Session Database Operations
 */
export class SessionRepository {
  async createSession(userId: string): Promise<Session> {
    const db = requireSupabase();
    const { data, error } = await db
      .from('sessions')
      .insert([{ user_id: userId, is_active: true }])
      .select()
      .single();

    if (error) {
      logger.error('Error creating session', { error });
      throw new Error('Failed to create session');
    }

    return data as Session;
  }

  async getSessionById(sessionId: string): Promise<Session | null> {
    const db = requireSupabase();
    const { data, error } = await db
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error('Error fetching session', { error });
      throw new Error('Failed to fetch session');
    }

    return data as Session | null;
  }

  async getActiveSessionForUser(userId: string): Promise<Session | null> {
    const db = requireSupabase();
    const { data, error } = await db
      .from('sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('started_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error('Error fetching active session', { error });
      return null;
    }

    return data as Session | null;
  }

  async endSession(sessionId: string): Promise<void> {
    const db = requireSupabase();
    const { error } = await db
      .from('sessions')
      .update({ is_active: false, ended_at: new Date().toISOString() })
      .eq('id', sessionId);

    if (error) {
      logger.error('Error ending session', { error });
      throw new Error('Failed to end session');
    }
  }
}

/**
 * Message Database Operations
 */
export class MessageRepository {
  async createMessage(messageData: Omit<Message, 'id' | 'timestamp'>): Promise<Message> {
    const db = requireSupabase();
    const { data, error } = await db
      .from('messages')
      .insert([messageData])
      .select()
      .single();

    if (error) {
      logger.error('Error creating message', { error });
      throw new Error('Failed to create message');
    }

    return data as Message;
  }

  async getMessagesBySession(sessionId: string, limit = 50): Promise<Message[]> {
    const db = requireSupabase();
    const { data, error } = await db
      .from('messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('timestamp', { ascending: true })
      .limit(limit);

    if (error) {
      logger.error('Error fetching messages', { error });
      throw new Error('Failed to fetch messages');
    }

    return data as Message[];
  }

  async getRecentMessages(sessionId: string, count = 10): Promise<Message[]> {
    const db = requireSupabase();
    const { data, error } = await db
      .from('messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('timestamp', { ascending: false })
      .limit(count);

    if (error) {
      logger.error('Error fetching recent messages', { error });
      throw new Error('Failed to fetch recent messages');
    }

    return (data as Message[]).reverse();
  }
}

/**
 * Business Profile Database Operations
 */
export class BusinessProfileRepository {
  async createProfile(profileData: Omit<BusinessProfile, 'id' | 'created_at' | 'updated_at'>): Promise<BusinessProfile> {
    const db = requireSupabase();
    const { data, error } = await db
      .from('business_profiles')
      .insert([profileData])
      .select()
      .single();

    if (error) {
      logger.error('Error creating business profile', { error });
      throw new Error('Failed to create business profile');
    }

    return data as BusinessProfile;
  }

  async getProfileByUserId(userId: string): Promise<BusinessProfile | null> {
    const db = requireSupabase();
    const { data, error } = await db
      .from('business_profiles')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error('Error fetching business profile', { error });
      return null;
    }

    return data as BusinessProfile | null;
  }

  async updateProfile(profileId: string, updates: Partial<BusinessProfile>): Promise<BusinessProfile> {
    const db = requireSupabase();
    const { data, error } = await db
      .from('business_profiles')
      .update(updates)
      .eq('id', profileId)
      .select()
      .single();

    if (error) {
      logger.error('Error updating business profile', { error });
      throw new Error('Failed to update business profile');
    }

    return data as BusinessProfile;
  }
}

/**
 * Document Database Operations
 */
export class DocumentRepository {
  async createDocument(documentData: Omit<Document, 'id' | 'uploaded_at'>): Promise<Document> {
    const db = requireSupabase();
    const { data, error } = await db
      .from('documents')
      .insert([documentData])
      .select()
      .single();

    if (error) {
      logger.error('Error creating document', { error });
      throw new Error('Failed to create document');
    }

    return data as Document;
  }

  async getDocumentsByUserId(userId: string): Promise<Document[]> {
    const db = requireSupabase();
    const { data, error } = await db
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .order('uploaded_at', { ascending: false });

    if (error) {
      logger.error('Error fetching documents', { error });
      throw new Error('Failed to fetch documents');
    }

    return data as Document[];
  }

  async getDocumentById(documentId: string): Promise<Document | null> {
    const db = requireSupabase();
    const { data, error } = await db
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error('Error fetching document', { error });
      return null;
    }

    return data as Document | null;
  }
}

/**
 * Compliance Result Database Operations
 */
export class ComplianceResultRepository {
  async saveComplianceResult(resultData: Omit<ComplianceResult, 'id' | 'created_at' | 'updated_at'>): Promise<ComplianceResult> {
    const db = requireSupabase();
    const { data, error } = await db
      .from('compliance_results')
      .insert([resultData])
      .select()
      .single();

    if (error) {
      logger.error('Error saving compliance result', { error });
      throw new Error('Failed to save compliance result');
    }

    return data as ComplianceResult;
  }

  async getComplianceResultsByProfile(profileId: string): Promise<ComplianceResult[]> {
    const db = requireSupabase();
    const { data, error } = await db
      .from('compliance_results')
      .select('*')
      .eq('business_profile_id', profileId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching compliance results', { error });
      throw new Error('Failed to fetch compliance results');
    }

    return data as ComplianceResult[];
  }

  async updateComplianceStatus(resultId: string, status: string): Promise<ComplianceResult> {
    const db = requireSupabase();
    const { data, error } = await db
      .from('compliance_results')
      .update({ status })
      .eq('id', resultId)
      .select()
      .single();

    if (error) {
      logger.error('Error updating compliance status', { error });
      throw new Error('Failed to update compliance status');
    }

    return data as ComplianceResult;
  }
}

// Export repository instances
export const userRepo = new UserRepository();
export const sessionRepo = new SessionRepository();
export const messageRepo = new MessageRepository();
export const businessProfileRepo = new BusinessProfileRepository();
export const documentRepo = new DocumentRepository();
export const complianceResultRepo = new ComplianceResultRepository();
