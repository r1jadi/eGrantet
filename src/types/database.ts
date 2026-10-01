export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      appeals: {
        Row: {
          applicant_id: string
          application_id: string
          created_at: string
          decided_at: string | null
          decision_note: string | null
          explanation: string
          id: string
          reason: string
          status: Database["public"]["Enums"]["appeal_status"]
          updated_at: string
        }
        Insert: {
          applicant_id: string
          application_id: string
          created_at?: string
          decided_at?: string | null
          decision_note?: string | null
          explanation: string
          id?: string
          reason: string
          status?: Database["public"]["Enums"]["appeal_status"]
          updated_at?: string
        }
        Update: {
          applicant_id?: string
          application_id?: string
          created_at?: string
          decided_at?: string | null
          decision_note?: string | null
          explanation?: string
          id?: string
          reason?: string
          status?: Database["public"]["Enums"]["appeal_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appeals_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appeals_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: true
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      application_documents: {
        Row: {
          application_id: string
          content_type: string
          created_at: string
          document_type: string
          file_name: string
          file_size_bytes: number
          id: string
          requirement_id: string | null
          status: Database["public"]["Enums"]["document_status"]
          storage_path: string
          updated_at: string
        }
        Insert: {
          application_id: string
          content_type?: string
          created_at?: string
          document_type: string
          file_name: string
          file_size_bytes?: number
          id?: string
          requirement_id?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          storage_path: string
          updated_at?: string
        }
        Update: {
          application_id?: string
          content_type?: string
          created_at?: string
          document_type?: string
          file_name?: string
          file_size_bytes?: number
          id?: string
          requirement_id?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          storage_path?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_documents_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_documents_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "grant_requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      application_verifications: {
        Row: {
          application_id: string
          completed_at: string | null
          created_at: string
          error_message: string | null
          inconsistencies: Json
          missing_document_requirement_ids: Json
          run_id: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["application_verification_status"]
          summary: string | null
          updated_at: string
        }
        Insert: {
          application_id: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          inconsistencies?: Json
          missing_document_requirement_ids?: Json
          run_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["application_verification_status"]
          summary?: string | null
          updated_at?: string
        }
        Update: {
          application_id?: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          inconsistencies?: Json
          missing_document_requirement_ids?: Json
          run_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["application_verification_status"]
          summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_verifications_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: true
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          ai_summary: string | null
          ai_summary_generated_at: string | null
          answers: Json
          applicant_id: string
          created_at: string
          grant_id: string
          id: string
          status: Database["public"]["Enums"]["application_status"]
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          ai_summary?: string | null
          ai_summary_generated_at?: string | null
          answers?: Json
          applicant_id: string
          created_at?: string
          grant_id: string
          id?: string
          status?: Database["public"]["Enums"]["application_status"]
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          ai_summary?: string | null
          ai_summary_generated_at?: string | null
          answers?: Json
          applicant_id?: string
          created_at?: string
          grant_id?: string
          id?: string
          status?: Database["public"]["Enums"]["application_status"]
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_grant_id_fkey"
            columns: ["grant_id"]
            isOneToOne: false
            referencedRelation: "grants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      business_documents: {
        Row: {
          content_type: string
          created_at: string
          document_type: string
          file_name: string
          file_size_bytes: number
          id: string
          storage_path: string
          user_id: string
        }
        Insert: {
          content_type: string
          created_at?: string
          document_type?: string
          file_name: string
          file_size_bytes: number
          id?: string
          storage_path: string
          user_id: string
        }
        Update: {
          content_type?: string
          created_at?: string
          document_type?: string
          file_name?: string
          file_size_bytes?: number
          id?: string
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      business_profiles: {
        Row: {
          business_nui: string
          created_at: string
          display_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          business_nui: string
          created_at?: string
          display_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          business_nui?: string
          created_at?: string
          display_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      document_verifications: {
        Row: {
          application_document_id: string
          confidence: number | null
          created_at: string
          extracted_data: Json
          flags: Json
          id: string
          status: Database["public"]["Enums"]["verification_status"]
          updated_at: string
        }
        Insert: {
          application_document_id: string
          confidence?: number | null
          created_at?: string
          extracted_data?: Json
          flags?: Json
          id?: string
          status?: Database["public"]["Enums"]["verification_status"]
          updated_at?: string
        }
        Update: {
          application_document_id?: string
          confidence?: number | null
          created_at?: string
          extracted_data?: Json
          flags?: Json
          id?: string
          status?: Database["public"]["Enums"]["verification_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_verifications_application_document_id_fkey"
            columns: ["application_document_id"]
            isOneToOne: false
            referencedRelation: "application_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      eligibility_checks: {
        Row: {
          application_id: string
          checked_at: string | null
          created_at: string
          id: string
          reason: string | null
          requirement_id: string | null
          result: Database["public"]["Enums"]["eligibility_result"]
        }
        Insert: {
          application_id: string
          checked_at?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          requirement_id?: string | null
          result?: Database["public"]["Enums"]["eligibility_result"]
        }
        Update: {
          application_id?: string
          checked_at?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          requirement_id?: string | null
          result?: Database["public"]["Enums"]["eligibility_result"]
        }
        Relationships: [
          {
            foreignKeyName: "eligibility_checks_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eligibility_checks_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "grant_requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_assignments: {
        Row: {
          application_id: string
          assigned_at: string
          blind: boolean
          evaluator_id: string
        }
        Insert: {
          application_id: string
          assigned_at?: string
          blind?: boolean
          evaluator_id: string
        }
        Update: {
          application_id?: string
          assigned_at?: string
          blind?: boolean
          evaluator_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_assignments_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_assignments_evaluator_id_fkey"
            columns: ["evaluator_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_criteria: {
        Row: {
          auto_config: Json
          created_at: string
          description: string
          display_order: number
          grant_id: string
          id: string
          is_active: boolean
          maximum_score: number
          name: string
          scoring_mode: Database["public"]["Enums"]["criterion_scoring_mode"]
          updated_at: string
          weight: number
        }
        Insert: {
          auto_config?: Json
          created_at?: string
          description?: string
          display_order?: number
          grant_id: string
          id?: string
          is_active?: boolean
          maximum_score: number
          name: string
          scoring_mode?: Database["public"]["Enums"]["criterion_scoring_mode"]
          updated_at?: string
          weight?: number
        }
        Update: {
          auto_config?: Json
          created_at?: string
          description?: string
          display_order?: number
          grant_id?: string
          id?: string
          is_active?: boolean
          maximum_score?: number
          name?: string
          scoring_mode?: Database["public"]["Enums"]["criterion_scoring_mode"]
          updated_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_criteria_grant_id_fkey"
            columns: ["grant_id"]
            isOneToOne: false
            referencedRelation: "grants"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluations: {
        Row: {
          application_id: string
          comment: string | null
          created_at: string
          criterion_scores: Json
          evaluator_id: string
          id: string
          score: number | null
          status: Database["public"]["Enums"]["evaluation_status"]
          updated_at: string
        }
        Insert: {
          application_id: string
          comment?: string | null
          created_at?: string
          criterion_scores?: Json
          evaluator_id: string
          id?: string
          score?: number | null
          status?: Database["public"]["Enums"]["evaluation_status"]
          updated_at?: string
        }
        Update: {
          application_id?: string
          comment?: string | null
          created_at?: string
          criterion_scores?: Json
          evaluator_id?: string
          id?: string
          score?: number | null
          status?: Database["public"]["Enums"]["evaluation_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_evaluator_id_fkey"
            columns: ["evaluator_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      grant_requirements: {
        Row: {
          configuration: Json
          created_at: string
          description: string
          display_order: number
          grant_id: string
          id: string
          is_required: boolean
          name: string
          type: Database["public"]["Enums"]["requirement_type"]
          updated_at: string
        }
        Insert: {
          configuration?: Json
          created_at?: string
          description?: string
          display_order?: number
          grant_id: string
          id?: string
          is_required?: boolean
          name: string
          type: Database["public"]["Enums"]["requirement_type"]
          updated_at?: string
        }
        Update: {
          configuration?: Json
          created_at?: string
          description?: string
          display_order?: number
          grant_id?: string
          id?: string
          is_required?: boolean
          name?: string
          type?: Database["public"]["Enums"]["requirement_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grant_requirements_grant_id_fkey"
            columns: ["grant_id"]
            isOneToOne: false
            referencedRelation: "grants"
            referencedColumns: ["id"]
          },
        ]
      }
      grantee_projects: {
        Row: {
          application_id: string
          awarded_amount: number
          awarded_currency: string
          created_at: string
          grantee_id: string
          id: string
          municipality_id: string
          progress: number
          project_end: string
          project_start: string
          status: Database["public"]["Enums"]["project_status"]
          title: string
          updated_at: string
        }
        Insert: {
          application_id: string
          awarded_amount: number
          awarded_currency?: string
          created_at?: string
          grantee_id: string
          id?: string
          municipality_id: string
          progress?: number
          project_end: string
          project_start: string
          status?: Database["public"]["Enums"]["project_status"]
          title: string
          updated_at?: string
        }
        Update: {
          application_id?: string
          awarded_amount?: number
          awarded_currency?: string
          created_at?: string
          grantee_id?: string
          id?: string
          municipality_id?: string
          progress?: number
          project_end?: string
          project_start?: string
          status?: Database["public"]["Enums"]["project_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grantee_projects_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: true
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grantee_projects_grantee_id_fkey"
            columns: ["grantee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grantee_projects_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipalities"
            referencedColumns: ["id"]
          },
        ]
      }
      grants: {
        Row: {
          application_deadline: string | null
          created_at: string
          description: string
          funding_amount: number | null
          funding_currency: string | null
          id: string
          maximum_amount_per_applicant: number | null
          municipality_id: string
          status: Database["public"]["Enums"]["grant_status"]
          title: string
          updated_at: string
        }
        Insert: {
          application_deadline?: string | null
          created_at?: string
          description?: string
          funding_amount?: number | null
          funding_currency?: string | null
          id?: string
          maximum_amount_per_applicant?: number | null
          municipality_id: string
          status?: Database["public"]["Enums"]["grant_status"]
          title: string
          updated_at?: string
        }
        Update: {
          application_deadline?: string | null
          created_at?: string
          description?: string
          funding_amount?: number | null
          funding_currency?: string | null
          id?: string
          maximum_amount_per_applicant?: number | null
          municipality_id?: string
          status?: Database["public"]["Enums"]["grant_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grants_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipalities"
            referencedColumns: ["id"]
          },
        ]
      }
      milestone_evidence: {
        Row: {
          content_type: string
          created_at: string
          document_type: string
          file_name: string
          file_size_bytes: number
          id: string
          storage_path: string
          submission_id: string
        }
        Insert: {
          content_type?: string
          created_at?: string
          document_type: string
          file_name: string
          file_size_bytes?: number
          id?: string
          storage_path: string
          submission_id: string
        }
        Update: {
          content_type?: string
          created_at?: string
          document_type?: string
          file_name?: string
          file_size_bytes?: number
          id?: string
          storage_path?: string
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestone_evidence_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: true
            referencedRelation: "milestone_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      milestone_submissions: {
        Row: {
          created_at: string
          grantee_id: string
          id: string
          kind: Database["public"]["Enums"]["submission_kind"]
          message: string
          milestone_id: string
          review_comment: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["milestone_status"]
        }
        Insert: {
          created_at?: string
          grantee_id: string
          id?: string
          kind?: Database["public"]["Enums"]["submission_kind"]
          message?: string
          milestone_id: string
          review_comment?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["milestone_status"]
        }
        Update: {
          created_at?: string
          grantee_id?: string
          id?: string
          kind?: Database["public"]["Enums"]["submission_kind"]
          message?: string
          milestone_id?: string
          review_comment?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["milestone_status"]
        }
        Relationships: [
          {
            foreignKeyName: "milestone_submissions_grantee_id_fkey"
            columns: ["grantee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milestone_submissions_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "project_milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milestone_submissions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      municipalities: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      municipality_members: {
        Row: {
          created_at: string
          municipality_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          municipality_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          municipality_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "municipality_members_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipalities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "municipality_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_emails: {
        Row: {
          created_at: string
          dedup_key: string
          email_category: string
          error_message: string | null
          id: string
          notification_id: string | null
          provider_message_id: string | null
          recipient_email: string
          sent_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dedup_key: string
          email_category: string
          error_message?: string | null
          id?: string
          notification_id?: string | null
          provider_message_id?: string | null
          recipient_email: string
          sent_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dedup_key?: string
          email_category?: string
          error_message?: string | null
          id?: string
          notification_id?: string | null
          provider_message_id?: string | null
          recipient_email?: string
          sent_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_emails_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_emails_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          application_updates: boolean
          created_at: string
          decision_notifications: boolean
          document_updates: boolean
          evaluation_updates: boolean
          grant_announcements: boolean
          milestone_updates: boolean
          recommended_grants: boolean
          updated_at: string
          user_id: string
          verification_updates: boolean
        }
        Insert: {
          application_updates?: boolean
          created_at?: string
          decision_notifications?: boolean
          document_updates?: boolean
          evaluation_updates?: boolean
          grant_announcements?: boolean
          milestone_updates?: boolean
          recommended_grants?: boolean
          updated_at?: string
          user_id: string
          verification_updates?: boolean
        }
        Update: {
          application_updates?: boolean
          created_at?: string
          decision_notifications?: boolean
          document_updates?: boolean
          evaluation_updates?: boolean
          grant_announcements?: boolean
          milestone_updates?: boolean
          recommended_grants?: boolean
          updated_at?: string
          user_id?: string
          verification_updates?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          application_id: string | null
          created_at: string
          id: string
          message: string
          read_at: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          application_id?: string | null
          created_at?: string
          id?: string
          message: string
          read_at?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          application_id?: string | null
          created_at?: string
          id?: string
          message?: string
          read_at?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      project_milestones: {
        Row: {
          created_at: string
          description: string
          display_order: number
          due_date: string
          id: string
          progress: number
          project_id: string
          requires_evidence: boolean
          status: Database["public"]["Enums"]["milestone_status"]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          display_order?: number
          due_date: string
          id?: string
          progress?: number
          project_id: string
          requires_evidence?: boolean
          status?: Database["public"]["Enums"]["milestone_status"]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          display_order?: number
          due_date?: string
          id?: string
          progress?: number
          project_id?: string
          requires_evidence?: boolean
          status?: Database["public"]["Enums"]["milestone_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "grantee_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      requirement_verifications: {
        Row: {
          application_id: string
          confidence: number | null
          created_at: string
          evidence: Json
          explanation: string
          id: string
          requirement_id: string
          result: Database["public"]["Enums"]["requirement_verification_result"]
          run_id: string
          source: Database["public"]["Enums"]["verification_source"]
          status: Database["public"]["Enums"]["application_verification_status"]
          updated_at: string
        }
        Insert: {
          application_id: string
          confidence?: number | null
          created_at?: string
          evidence?: Json
          explanation?: string
          id?: string
          requirement_id: string
          result: Database["public"]["Enums"]["requirement_verification_result"]
          run_id: string
          source: Database["public"]["Enums"]["verification_source"]
          status?: Database["public"]["Enums"]["application_verification_status"]
          updated_at?: string
        }
        Update: {
          application_id?: string
          confidence?: number | null
          created_at?: string
          evidence?: Json
          explanation?: string
          id?: string
          requirement_id?: string
          result?: Database["public"]["Enums"]["requirement_verification_result"]
          run_id?: string
          source?: Database["public"]["Enums"]["verification_source"]
          status?: Database["public"]["Enums"]["application_verification_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "requirement_verifications_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requirement_verifications_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "grant_requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          language: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          language?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          language?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_application: {
        Args: { target_application_id: string }
        Returns: boolean
      }
      can_access_grantee_project: {
        Args: { target_project_id: string }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_application_evaluator: {
        Args: { target_application_id: string }
        Returns: boolean
      }
      is_municipality_member: {
        Args: { target_municipality_id: string }
        Returns: boolean
      }
      is_valid_nui: { Args: { value: string }; Returns: boolean }
    }
    Enums: {
      appeal_status: "SUBMITTED" | "UNDER_REVIEW" | "DECISION_MADE"
      application_status:
        | "DRAFT"
        | "SUBMITTED"
        | "UNDER_REVIEW"
        | "CORRECTION_REQUESTED"
        | "DECIDED"
        | "WITHDRAWN"
        | "APPROVED"
        | "REJECTED"
      application_verification_status:
        | "NOT_STARTED"
        | "PROCESSING"
        | "COMPLETED"
        | "NEEDS_REVIEW"
        | "FAILED"
      criterion_scoring_mode: "MANUAL" | "AUTOMATIC"
      document_status: "UPLOADED" | "REPLACEMENT_REQUESTED" | "ARCHIVED"
      eligibility_result: "PENDING" | "PASSED" | "FAILED"
      evaluation_status: "DRAFT" | "SUBMITTED"
      grant_status: "DRAFT" | "PUBLISHED" | "CLOSED" | "ARCHIVED"
      milestone_status:
        | "PENDING"
        | "SUBMITTED"
        | "CORRECTION_REQUESTED"
        | "APPROVED"
      notification_type:
        | "APPLICATION_STATUS"
        | "CORRECTION_REQUEST"
        | "SYSTEM"
        | "MILESTONE"
        | "GRANT_RECOMMENDATION"
        | "VERIFICATION"
        | "EVALUATION"
      project_status: "ACTIVE" | "COMPLETED" | "SUSPENDED"
      requirement_type:
        | "ELIGIBILITY"
        | "DOCUMENT"
        | "FINANCIAL"
        | "APPLICANT"
        | "OTHER"
        | "PROJECT"
      requirement_verification_result:
        | "PASS"
        | "FAIL"
        | "NEEDS_REVIEW"
        | "NOT_VERIFIABLE"
      submission_kind: "EVIDENCE" | "PHOTO" | "NOTE"
      user_role: "APPLICANT" | "MUNICIPAL_EMPLOYEE" | "EVALUATOR" | "ADMIN"
      verification_source: "DETERMINISTIC" | "AI" | "SYSTEM"
      verification_status:
        | "PENDING"
        | "VERIFIED"
        | "FLAGGED"
        | "FAILED"
        | "UNREADABLE"
        | "NEEDS_REVIEW"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      appeal_status: ["SUBMITTED", "UNDER_REVIEW", "DECISION_MADE"],
      application_status: [
        "DRAFT",
        "SUBMITTED",
        "UNDER_REVIEW",
        "CORRECTION_REQUESTED",
        "DECIDED",
        "WITHDRAWN",
        "APPROVED",
        "REJECTED",
      ],
      application_verification_status: [
        "NOT_STARTED",
        "PROCESSING",
        "COMPLETED",
        "NEEDS_REVIEW",
        "FAILED",
      ],
      criterion_scoring_mode: ["MANUAL", "AUTOMATIC"],
      document_status: ["UPLOADED", "REPLACEMENT_REQUESTED", "ARCHIVED"],
      eligibility_result: ["PENDING", "PASSED", "FAILED"],
      evaluation_status: ["DRAFT", "SUBMITTED"],
      grant_status: ["DRAFT", "PUBLISHED", "CLOSED", "ARCHIVED"],
      milestone_status: [
        "PENDING",
        "SUBMITTED",
        "CORRECTION_REQUESTED",
        "APPROVED",
      ],
      notification_type: [
        "APPLICATION_STATUS",
        "CORRECTION_REQUEST",
        "SYSTEM",
        "MILESTONE",
        "GRANT_RECOMMENDATION",
        "VERIFICATION",
        "EVALUATION",
      ],
      project_status: ["ACTIVE", "COMPLETED", "SUSPENDED"],
      requirement_type: [
        "ELIGIBILITY",
        "DOCUMENT",
        "FINANCIAL",
        "APPLICANT",
        "OTHER",
        "PROJECT",
      ],
      requirement_verification_result: [
        "PASS",
        "FAIL",
        "NEEDS_REVIEW",
        "NOT_VERIFIABLE",
      ],
      submission_kind: ["EVIDENCE", "PHOTO", "NOTE"],
      user_role: ["APPLICANT", "MUNICIPAL_EMPLOYEE", "EVALUATOR", "ADMIN"],
      verification_source: ["DETERMINISTIC", "AI", "SYSTEM"],
      verification_status: [
        "PENDING",
        "VERIFIED",
        "FLAGGED",
        "FAILED",
        "UNREADABLE",
        "NEEDS_REVIEW",
      ],
    },
  },
} as const
