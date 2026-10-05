
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "agencies": {
                  Row: {
                    "checked_at": string | null,"created_at": string,"field": Database["public"]['Enums']["industry"] | null,"id": string,"import_batch_id": string | null,"min_plan": Database["public"]['Enums']["plan_level"],"model": Database["public"]['Enums']["agency_model"] | null,"name": string,"recruits_abroad": boolean,"region": string | null,"source": string | null,"specialised": boolean,"status": Database["public"]['Enums']["list_status"],"updated_at": string,"website": string | null
                  }
                  Insert: {
                    "checked_at"?: string | null,"created_at"?: string,"field"?: Database["public"]['Enums']["industry"] | null,"id"?: string,"import_batch_id"?: string | null,"min_plan"?: Database["public"]['Enums']["plan_level"],"model"?: Database["public"]['Enums']["agency_model"] | null,"name": string,"recruits_abroad"?: boolean,"region"?: string | null,"source"?: string | null,"specialised"?: boolean,"status"?: Database["public"]['Enums']["list_status"],"updated_at"?: string,"website"?: string | null
                  }
                  Update: {
                    "checked_at"?: string | null,"created_at"?: string,"field"?: Database["public"]['Enums']["industry"] | null,"id"?: string,"import_batch_id"?: string | null,"min_plan"?: Database["public"]['Enums']["plan_level"],"model"?: Database["public"]['Enums']["agency_model"] | null,"name"?: string,"recruits_abroad"?: boolean,"region"?: string | null,"source"?: string | null,"specialised"?: boolean,"status"?: Database["public"]['Enums']["list_status"],"updated_at"?: string,"website"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "agencies_import_batch_id_fkey"
      columns: ["import_batch_id"]
isOneToOne: false
      referencedRelation: "import_batches"
      referencedColumns: ["id"]
    }
                  ]
                },"app_settings": {
                  Row: {
                    "created_at": string,"key": string,"updated_at": string,"value": string
                  }
                  Insert: {
                    "created_at"?: string,"key": string,"updated_at"?: string,"value": string
                  }
                  Update: {
                    "created_at"?: string,"key"?: string,"updated_at"?: string,"value"?: string
                  }
                  Relationships: [
                    
                  ]
                },"application_events": {
                  Row: {
                    "application_id": string,"created_at": string,"happened_on": string,"id": string,"text": string,"updated_at": string,"user_id": string
                  }
                  Insert: {
                    "application_id": string,"created_at"?: string,"happened_on"?: string,"id"?: string,"text": string,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "application_id"?: string,"created_at"?: string,"happened_on"?: string,"id"?: string,"text"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "application_events_application_id_user_id_fkey"
      columns: ["application_id","user_id"]
isOneToOne: false
      referencedRelation: "applications"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"applications": {
                  Row: {
                    "applied_on": string | null,"company": string,"company_id": string | null,"contact": string | null,"created_at": string,"id": string,"job_id": string | null,"job_url": string | null,"location": string | null,"next_on": string | null,"next_type": Database["public"]['Enums']["next_step_type"],"notes": string | null,"position": string | null,"reminded_for": string | null,"source": Database["public"]['Enums']["application_source"] | null,"status": Database["public"]['Enums']["application_status"],"updated_at": string,"user_id": string
                  }
                  Insert: {
                    "applied_on"?: string | null,"company": string,"company_id"?: string | null,"contact"?: string | null,"created_at"?: string,"id"?: string,"job_id"?: string | null,"job_url"?: string | null,"location"?: string | null,"next_on"?: string | null,"next_type"?: Database["public"]['Enums']["next_step_type"],"notes"?: string | null,"position"?: string | null,"reminded_for"?: string | null,"source"?: Database["public"]['Enums']["application_source"] | null,"status"?: Database["public"]['Enums']["application_status"],"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "applied_on"?: string | null,"company"?: string,"company_id"?: string | null,"contact"?: string | null,"created_at"?: string,"id"?: string,"job_id"?: string | null,"job_url"?: string | null,"location"?: string | null,"next_on"?: string | null,"next_type"?: Database["public"]['Enums']["next_step_type"],"notes"?: string | null,"position"?: string | null,"reminded_for"?: string | null,"source"?: Database["public"]['Enums']["application_source"] | null,"status"?: Database["public"]['Enums']["application_status"],"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "applications_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "applications_job_id_fkey"
      columns: ["job_id"]
isOneToOne: false
      referencedRelation: "jobs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "applications_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    }
                  ]
                },"articles": {
                  Row: {
                    "area": Database["public"]['Enums']["article_area"],"body": string,"created_at": string,"id": string,"language": Database["public"]['Enums']["portal_language"],"lead": string | null,"min_plan": Database["public"]['Enums']["plan_level"],"published": boolean,"slug": string,"sort": number,"title": string,"updated_at": string
                  }
                  Insert: {
                    "area": Database["public"]['Enums']["article_area"],"body"?: string,"created_at"?: string,"id"?: string,"language"?: Database["public"]['Enums']["portal_language"],"lead"?: string | null,"min_plan"?: Database["public"]['Enums']["plan_level"],"published"?: boolean,"slug": string,"sort"?: number,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "area"?: Database["public"]['Enums']["article_area"],"body"?: string,"created_at"?: string,"id"?: string,"language"?: Database["public"]['Enums']["portal_language"],"lead"?: string | null,"min_plan"?: Database["public"]['Enums']["plan_level"],"published"?: boolean,"slug"?: string,"sort"?: number,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"audit_log": {
                  Row: {
                    "actor": string,"created_at": string,"id": string,"text": string,"user_id": string | null
                  }
                  Insert: {
                    "actor": string,"created_at"?: string,"id"?: string,"text": string,"user_id"?: string | null
                  }
                  Update: {
                    "actor"?: string,"created_at"?: string,"id"?: string,"text"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "audit_log_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    }
                  ]
                },"checklist_items": {
                  Row: {
                    "active": boolean,"checklist_id": string,"created_at": string,"description": string | null,"example": string | null,"id": string,"link_label": string | null,"link_target": string | null,"min_plan": Database["public"]['Enums']["plan_level"],"section": string | null,"sort": number,"title": string,"updated_at": string
                  }
                  Insert: {
                    "active"?: boolean,"checklist_id": string,"created_at"?: string,"description"?: string | null,"example"?: string | null,"id"?: string,"link_label"?: string | null,"link_target"?: string | null,"min_plan"?: Database["public"]['Enums']["plan_level"],"section"?: string | null,"sort"?: number,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "active"?: boolean,"checklist_id"?: string,"created_at"?: string,"description"?: string | null,"example"?: string | null,"id"?: string,"link_label"?: string | null,"link_target"?: string | null,"min_plan"?: Database["public"]['Enums']["plan_level"],"section"?: string | null,"sort"?: number,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "checklist_items_checklist_id_fkey"
      columns: ["checklist_id"]
isOneToOne: false
      referencedRelation: "checklists"
      referencedColumns: ["id"]
    }
                  ]
                },"checklist_progress": {
                  Row: {
                    "done_at": string,"id": string,"item_id": string,"user_id": string
                  }
                  Insert: {
                    "done_at"?: string,"id"?: string,"item_id": string,"user_id"?: string
                  }
                  Update: {
                    "done_at"?: string,"id"?: string,"item_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "checklist_progress_item_id_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "checklist_items"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "checklist_progress_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    }
                  ]
                },"checklists": {
                  Row: {
                    "active": boolean,"area": Database["public"]['Enums']["checklist_area"],"created_at": string,"id": string,"key": string,"legal_note": string | null,"sort": number,"title": string,"updated_at": string
                  }
                  Insert: {
                    "active"?: boolean,"area": Database["public"]['Enums']["checklist_area"],"created_at"?: string,"id"?: string,"key": string,"legal_note"?: string | null,"sort"?: number,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "active"?: boolean,"area"?: Database["public"]['Enums']["checklist_area"],"created_at"?: string,"id"?: string,"key"?: string,"legal_note"?: string | null,"sort"?: number,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"companies": {
                  Row: {
                    "checked_at": string | null,"created_at": string,"domain": string | null,"employer_type": Database["public"]['Enums']["employer_type"] | null,"id": string,"import_batch_id": string | null,"industry": Database["public"]['Enums']["industry"] | null,"min_plan": Database["public"]['Enums']["plan_level"],"name": string,"region": string | null,"signals": (Database["public"]['Enums']["company_signal"])[],"source": string | null,"status": Database["public"]['Enums']["list_status"],"updated_at": string,"website": string | null
                  }
                  Insert: {
                    "checked_at"?: string | null,"created_at"?: string,"domain"?: string | null,"employer_type"?: Database["public"]['Enums']["employer_type"] | null,"id"?: string,"import_batch_id"?: string | null,"industry"?: Database["public"]['Enums']["industry"] | null,"min_plan"?: Database["public"]['Enums']["plan_level"],"name": string,"region"?: string | null,"signals"?: (Database["public"]['Enums']["company_signal"])[],"source"?: string | null,"status"?: Database["public"]['Enums']["list_status"],"updated_at"?: string,"website"?: string | null
                  }
                  Update: {
                    "checked_at"?: string | null,"created_at"?: string,"domain"?: string | null,"employer_type"?: Database["public"]['Enums']["employer_type"] | null,"id"?: string,"import_batch_id"?: string | null,"industry"?: Database["public"]['Enums']["industry"] | null,"min_plan"?: Database["public"]['Enums']["plan_level"],"name"?: string,"region"?: string | null,"signals"?: (Database["public"]['Enums']["company_signal"])[],"source"?: string | null,"status"?: Database["public"]['Enums']["list_status"],"updated_at"?: string,"website"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "companies_import_batch_id_fkey"
      columns: ["import_batch_id"]
isOneToOne: false
      referencedRelation: "import_batches"
      referencedColumns: ["id"]
    }
                  ]
                },"consent_texts": {
                  Row: {
                    "active": boolean,"body": string,"created_at": string,"id": string,"language": Database["public"]['Enums']["portal_language"],"updated_at": string,"version": string
                  }
                  Insert: {
                    "active"?: boolean,"body": string,"created_at"?: string,"id"?: string,"language"?: Database["public"]['Enums']["portal_language"],"updated_at"?: string,"version": string
                  }
                  Update: {
                    "active"?: boolean,"body"?: string,"created_at"?: string,"id"?: string,"language"?: Database["public"]['Enums']["portal_language"],"updated_at"?: string,"version"?: string
                  }
                  Relationships: [
                    
                  ]
                },"dismissed_tasks": {
                  Row: {
                    "dismissed_at": string,"id": string,"task_key": Database["public"]['Enums']["task_key"],"user_id": string
                  }
                  Insert: {
                    "dismissed_at"?: string,"id"?: string,"task_key": Database["public"]['Enums']["task_key"],"user_id"?: string
                  }
                  Update: {
                    "dismissed_at"?: string,"id"?: string,"task_key"?: Database["public"]['Enums']["task_key"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "dismissed_tasks_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    }
                  ]
                },"email_log": {
                  Row: {
                    "id": string,"kind": Database["public"]['Enums']["email_kind"],"ref_id": string | null,"sent_at": string,"sent_on": string,"user_id": string
                  }
                  Insert: {
                    "id"?: string,"kind": Database["public"]['Enums']["email_kind"],"ref_id"?: string | null,"sent_at"?: string,"sent_on"?: string,"user_id": string
                  }
                  Update: {
                    "id"?: string,"kind"?: Database["public"]['Enums']["email_kind"],"ref_id"?: string | null,"sent_at"?: string,"sent_on"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "email_log_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    }
                  ]
                },"glossary_terms": {
                  Row: {
                    "created_at": string,"id": string,"language": Database["public"]['Enums']["portal_language"],"look_for": string | null,"min_plan": Database["public"]['Enums']["plan_level"],"sort": number,"term_de": string,"term_en": string,"updated_at": string,"what": string
                  }
                  Insert: {
                    "created_at"?: string,"id"?: string,"language"?: Database["public"]['Enums']["portal_language"],"look_for"?: string | null,"min_plan"?: Database["public"]['Enums']["plan_level"],"sort"?: number,"term_de": string,"term_en": string,"updated_at"?: string,"what": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"language"?: Database["public"]['Enums']["portal_language"],"look_for"?: string | null,"min_plan"?: Database["public"]['Enums']["plan_level"],"sort"?: number,"term_de"?: string,"term_en"?: string,"updated_at"?: string,"what"?: string
                  }
                  Relationships: [
                    
                  ]
                },"import_batches": {
                  Row: {
                    "created_at": string,"created_by": string | null,"errors": NonNullable<Json>,"file_name": string,"id": string,"list": Database["public"]['Enums']["import_list"],"rows_failed": number,"rows_ok": number,"rows_total": number,"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"errors"?: NonNullable<Json>,"file_name": string,"id"?: string,"list": Database["public"]['Enums']["import_list"],"rows_failed"?: number,"rows_ok"?: number,"rows_total"?: number,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"errors"?: NonNullable<Json>,"file_name"?: string,"id"?: string,"list"?: Database["public"]['Enums']["import_list"],"rows_failed"?: number,"rows_ok"?: number,"rows_total"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "import_batches_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    }
                  ]
                },"job_boards": {
                  Row: {
                    "category": string | null,"checked_at": string | null,"created_at": string,"focus": string | null,"id": string,"import_batch_id": string | null,"min_plan": Database["public"]['Enums']["plan_level"],"name": string,"source": string | null,"status": Database["public"]['Enums']["list_status"],"updated_at": string,"website": string | null
                  }
                  Insert: {
                    "category"?: string | null,"checked_at"?: string | null,"created_at"?: string,"focus"?: string | null,"id"?: string,"import_batch_id"?: string | null,"min_plan"?: Database["public"]['Enums']["plan_level"],"name": string,"source"?: string | null,"status"?: Database["public"]['Enums']["list_status"],"updated_at"?: string,"website"?: string | null
                  }
                  Update: {
                    "category"?: string | null,"checked_at"?: string | null,"created_at"?: string,"focus"?: string | null,"id"?: string,"import_batch_id"?: string | null,"min_plan"?: Database["public"]['Enums']["plan_level"],"name"?: string,"source"?: string | null,"status"?: Database["public"]['Enums']["list_status"],"updated_at"?: string,"website"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "job_boards_import_batch_id_fkey"
      columns: ["import_batch_id"]
isOneToOne: false
      referencedRelation: "import_batches"
      referencedColumns: ["id"]
    }
                  ]
                },"jobs": {
                  Row: {
                    "checked_at": string | null,"company_id": string | null,"company_name": string,"created_at": string,"employer_type": Database["public"]['Enums']["employer_type"] | null,"expires_on": string | null,"id": string,"import_batch_id": string | null,"industry": Database["public"]['Enums']["industry"] | null,"location": string | null,"min_plan": Database["public"]['Enums']["plan_level"],"posted_on": string,"signals": (Database["public"]['Enums']["company_signal"])[],"source": string | null,"status": Database["public"]['Enums']["list_status"],"title": string,"updated_at": string,"url": string | null
                  }
                  Insert: {
                    "checked_at"?: string | null,"company_id"?: string | null,"company_name": string,"created_at"?: string,"employer_type"?: Database["public"]['Enums']["employer_type"] | null,"expires_on"?: string | null,"id"?: string,"import_batch_id"?: string | null,"industry"?: Database["public"]['Enums']["industry"] | null,"location"?: string | null,"min_plan"?: Database["public"]['Enums']["plan_level"],"posted_on"?: string,"signals"?: (Database["public"]['Enums']["company_signal"])[],"source"?: string | null,"status"?: Database["public"]['Enums']["list_status"],"title": string,"updated_at"?: string,"url"?: string | null
                  }
                  Update: {
                    "checked_at"?: string | null,"company_id"?: string | null,"company_name"?: string,"created_at"?: string,"employer_type"?: Database["public"]['Enums']["employer_type"] | null,"expires_on"?: string | null,"id"?: string,"import_batch_id"?: string | null,"industry"?: Database["public"]['Enums']["industry"] | null,"location"?: string | null,"min_plan"?: Database["public"]['Enums']["plan_level"],"posted_on"?: string,"signals"?: (Database["public"]['Enums']["company_signal"])[],"source"?: string | null,"status"?: Database["public"]['Enums']["list_status"],"title"?: string,"updated_at"?: string,"url"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "jobs_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "jobs_import_batch_id_fkey"
      columns: ["import_batch_id"]
isOneToOne: false
      referencedRelation: "import_batches"
      referencedColumns: ["id"]
    }
                  ]
                },"launch_settings": {
                  Row: {
                    "created_at": string,"grant_until": string | null,"id": boolean,"invite_code": string | null,"new_account_grant": Database["public"]['Enums']["account_grant"],"registration_mode": Database["public"]['Enums']["registration_mode"],"sales_enabled": boolean,"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"grant_until"?: string | null,"id"?: boolean,"invite_code"?: string | null,"new_account_grant"?: Database["public"]['Enums']["account_grant"],"registration_mode"?: Database["public"]['Enums']["registration_mode"],"sales_enabled"?: boolean,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"grant_until"?: string | null,"id"?: boolean,"invite_code"?: string | null,"new_account_grant"?: Database["public"]['Enums']["account_grant"],"registration_mode"?: Database["public"]['Enums']["registration_mode"],"sales_enabled"?: boolean,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"phrases": {
                  Row: {
                    "category": Database["public"]['Enums']["phrase_category"],"created_at": string,"english": string,"field": Database["public"]['Enums']["industry"] | null,"german": string,"id": string,"language": Database["public"]['Enums']["portal_language"],"min_plan": Database["public"]['Enums']["plan_level"],"sort": number,"updated_at": string,"usage": string | null
                  }
                  Insert: {
                    "category": Database["public"]['Enums']["phrase_category"],"created_at"?: string,"english": string,"field"?: Database["public"]['Enums']["industry"] | null,"german": string,"id"?: string,"language"?: Database["public"]['Enums']["portal_language"],"min_plan"?: Database["public"]['Enums']["plan_level"],"sort"?: number,"updated_at"?: string,"usage"?: string | null
                  }
                  Update: {
                    "category"?: Database["public"]['Enums']["phrase_category"],"created_at"?: string,"english"?: string,"field"?: Database["public"]['Enums']["industry"] | null,"german"?: string,"id"?: string,"language"?: Database["public"]['Enums']["portal_language"],"min_plan"?: Database["public"]['Enums']["plan_level"],"sort"?: number,"updated_at"?: string,"usage"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"plan_access": {
                  Row: {
                    "created_at": string,"manual_reason": string | null,"pass_length": Database["public"]['Enums']["pass_length"] | null,"plan": Database["public"]['Enums']["plan_level"],"source": Database["public"]['Enums']["access_source"],"stripe_customer_id": string | null,"updated_at": string,"user_id": string,"valid_until": string | null
                  }
                  Insert: {
                    "created_at"?: string,"manual_reason"?: string | null,"pass_length"?: Database["public"]['Enums']["pass_length"] | null,"plan"?: Database["public"]['Enums']["plan_level"],"source"?: Database["public"]['Enums']["access_source"],"stripe_customer_id"?: string | null,"updated_at"?: string,"user_id": string,"valid_until"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"manual_reason"?: string | null,"pass_length"?: Database["public"]['Enums']["pass_length"] | null,"plan"?: Database["public"]['Enums']["plan_level"],"source"?: Database["public"]['Enums']["access_source"],"stripe_customer_id"?: string | null,"updated_at"?: string,"user_id"?: string,"valid_until"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "plan_access_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    }
                  ]
                },"plan_periods": {
                  Row: {
                    "amount_cents": number | null,"created_at": string,"credit_days": number | null,"deleted_account_id": string | null,"ends_on": string,"granted_by": string,"id": string,"pass_length": Database["public"]['Enums']["pass_length"] | null,"plan": Database["public"]['Enums']["plan_level"],"promo_code": string | null,"reason": string | null,"refunded_at": string | null,"refunded_cents": number | null,"source": Database["public"]['Enums']["period_source"],"starts_on": string,"stripe_session_id": string | null,"superseded_by": string | null,"updated_at": string,"upgraded_from": Database["public"]['Enums']["plan_level"] | null,"user_id": string | null
                  }
                  Insert: {
                    "amount_cents"?: number | null,"created_at"?: string,"credit_days"?: number | null,"deleted_account_id"?: string | null,"ends_on": string,"granted_by": string,"id"?: string,"pass_length"?: Database["public"]['Enums']["pass_length"] | null,"plan": Database["public"]['Enums']["plan_level"],"promo_code"?: string | null,"reason"?: string | null,"refunded_at"?: string | null,"refunded_cents"?: number | null,"source": Database["public"]['Enums']["period_source"],"starts_on": string,"stripe_session_id"?: string | null,"superseded_by"?: string | null,"updated_at"?: string,"upgraded_from"?: Database["public"]['Enums']["plan_level"] | null,"user_id"?: string | null
                  }
                  Update: {
                    "amount_cents"?: number | null,"created_at"?: string,"credit_days"?: number | null,"deleted_account_id"?: string | null,"ends_on"?: string,"granted_by"?: string,"id"?: string,"pass_length"?: Database["public"]['Enums']["pass_length"] | null,"plan"?: Database["public"]['Enums']["plan_level"],"promo_code"?: string | null,"reason"?: string | null,"refunded_at"?: string | null,"refunded_cents"?: number | null,"source"?: Database["public"]['Enums']["period_source"],"starts_on"?: string,"stripe_session_id"?: string | null,"superseded_by"?: string | null,"updated_at"?: string,"upgraded_from"?: Database["public"]['Enums']["plan_level"] | null,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "plan_periods_superseded_by_fkey"
      columns: ["superseded_by"]
isOneToOne: false
      referencedRelation: "plan_periods"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "plan_periods_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    }
                  ]
                },"prices": {
                  Row: {
                    "active": boolean,"amount_cents": number,"created_at": string,"id": string,"pass_length": Database["public"]['Enums']["pass_length"],"plan": Database["public"]['Enums']["plan_level"],"stripe_price_id": string | null,"updated_at": string
                  }
                  Insert: {
                    "active"?: boolean,"amount_cents": number,"created_at"?: string,"id"?: string,"pass_length": Database["public"]['Enums']["pass_length"],"plan": Database["public"]['Enums']["plan_level"],"stripe_price_id"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "active"?: boolean,"amount_cents"?: number,"created_at"?: string,"id"?: string,"pass_length"?: Database["public"]['Enums']["pass_length"],"plan"?: Database["public"]['Enums']["plan_level"],"stripe_price_id"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "blocked_at": string | null,"confirmation_resends": number,"created_at": string,"field": Database["public"]['Enums']["industry"] | null,"first_login_at": string | null,"first_name": string,"invited_by_admin": boolean,"language": Database["public"]['Enums']["portal_language"],"last_name": string,"registration_source": string,"reminders_enabled": boolean,"role": Database["public"]['Enums']["user_role"],"updated_at": string,"user_id": string
                  }
                  Insert: {
                    "blocked_at"?: string | null,"confirmation_resends"?: number,"created_at"?: string,"field"?: Database["public"]['Enums']["industry"] | null,"first_login_at"?: string | null,"first_name": string,"invited_by_admin"?: boolean,"language"?: Database["public"]['Enums']["portal_language"],"last_name": string,"registration_source"?: string,"reminders_enabled"?: boolean,"role"?: Database["public"]['Enums']["user_role"],"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "blocked_at"?: string | null,"confirmation_resends"?: number,"created_at"?: string,"field"?: Database["public"]['Enums']["industry"] | null,"first_login_at"?: string | null,"first_name"?: string,"invited_by_admin"?: boolean,"language"?: Database["public"]['Enums']["portal_language"],"last_name"?: string,"registration_source"?: string,"reminders_enabled"?: boolean,"role"?: Database["public"]['Enums']["user_role"],"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"purchase_consents": {
                  Row: {
                    "consent_text_id": string,"consented_at": string,"created_at": string,"id": string,"pass_length": Database["public"]['Enums']["pass_length"],"plan": Database["public"]['Enums']["plan_level"],"plan_period_id": string | null,"stripe_session_id": string | null,"user_id": string | null
                  }
                  Insert: {
                    "consent_text_id": string,"consented_at"?: string,"created_at"?: string,"id"?: string,"pass_length": Database["public"]['Enums']["pass_length"],"plan": Database["public"]['Enums']["plan_level"],"plan_period_id"?: string | null,"stripe_session_id"?: string | null,"user_id"?: string | null
                  }
                  Update: {
                    "consent_text_id"?: string,"consented_at"?: string,"created_at"?: string,"id"?: string,"pass_length"?: Database["public"]['Enums']["pass_length"],"plan"?: Database["public"]['Enums']["plan_level"],"plan_period_id"?: string | null,"stripe_session_id"?: string | null,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "purchase_consents_consent_text_id_fkey"
      columns: ["consent_text_id"]
isOneToOne: false
      referencedRelation: "consent_texts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "purchase_consents_plan_period_id_fkey"
      columns: ["plan_period_id"]
isOneToOne: false
      referencedRelation: "plan_periods"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "purchase_consents_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    }
                  ]
                },"stripe_events": {
                  Row: {
                    "id": string,"received_at": string,"type": string
                  }
                  Insert: {
                    "id": string,"received_at"?: string,"type": string
                  }
                  Update: {
                    "id"?: string,"received_at"?: string,"type"?: string
                  }
                  Relationships: [
                    
                  ]
                },"templates": {
                  Row: {
                    "active": boolean,"area": Database["public"]['Enums']["article_area"],"created_at": string,"description": string | null,"file_path": string,"format": Database["public"]['Enums']["template_format"],"id": string,"language": Database["public"]['Enums']["portal_language"],"min_plan": Database["public"]['Enums']["plan_level"],"sort": number,"title": string,"updated_at": string
                  }
                  Insert: {
                    "active"?: boolean,"area"?: Database["public"]['Enums']["article_area"],"created_at"?: string,"description"?: string | null,"file_path": string,"format": Database["public"]['Enums']["template_format"],"id"?: string,"language"?: Database["public"]['Enums']["portal_language"],"min_plan"?: Database["public"]['Enums']["plan_level"],"sort"?: number,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "active"?: boolean,"area"?: Database["public"]['Enums']["article_area"],"created_at"?: string,"description"?: string | null,"file_path"?: string,"format"?: Database["public"]['Enums']["template_format"],"id"?: string,"language"?: Database["public"]['Enums']["portal_language"],"min_plan"?: Database["public"]['Enums']["plan_level"],"sort"?: number,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "attach_checkout_session":
{ Args: { "p_consent_id": string,"p_session_id": string }; Returns: undefined
                           },
"begin_checkout":
{ Args: { "p_consent_version": string,"p_length": Database["public"]['Enums']["pass_length"],"p_plan": Database["public"]['Enums']["plan_level"],"p_user_id": string }; Returns: Json
                           },
"call_daily_function":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"daily_mail_sent":
{ Args: { "p_kind": Database["public"]['Enums']["email_kind"],"p_ref_id"?: string,"p_user_id": string }; Returns: undefined
                           },
"daily_mails":
{ Args: Record<PropertyKey, never>; Returns: {
              "data": Json,"email": string,"first_name": string,"kind": Database["public"]['Enums']["email_kind"],"ref_id": string,"user_id": string
            }[]
                           },
"daily_run":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"effective_plan":
{ Args: { "uid": string }; Returns: Database["public"]['Enums']["plan_level"]
                           },
"grant_pass":
{ Args: { "p_amount_cents": number,"p_customer_id"?: string,"p_length": Database["public"]['Enums']["pass_length"],"p_plan": Database["public"]['Enums']["plan_level"],"p_promo_code"?: string,"p_session_id": string,"p_user_id": string }; Returns: Json
                           },
"is_active_user":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_open_application":
{ Args: { "status": Database["public"]['Enums']["application_status"] }; Returns: boolean
                           },
"locked_content":
{ Args: Record<PropertyKey, never>; Returns: {
              "area": string,"entries": number,"kind": string,"min_plan": Database["public"]['Enums']["plan_level"],"title": string
            }[]
                           },
"mark_first_login":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"pass_days":
{ Args: { "length": Database["public"]['Enums']["pass_length"] }; Returns: number
                           },
"pass_terms":
{ Args: { "p_length": Database["public"]['Enums']["pass_length"],"p_plan": Database["public"]['Enums']["plan_level"],"p_user_id": string }; Returns: {
              "credit_days": number,"current_plan": Database["public"]['Enums']["plan_level"],"current_source": Database["public"]['Enums']["access_source"],"ends_on": string,"starts_on": string,"upgrade": boolean
            }[]
                           },
"portal_today":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"preview_pass":
{ Args: { "p_length": Database["public"]['Enums']["pass_length"],"p_plan": Database["public"]['Enums']["plan_level"] }; Returns: {
              "amount_cents": number,"credit_days": number,"current_plan": Database["public"]['Enums']["plan_level"],"current_source": Database["public"]['Enums']["access_source"],"ends_on": string,"starts_on": string,"upgrade": boolean
            }[]
                           },
"public_settings":
{ Args: Record<PropertyKey, never>; Returns: {
              "free_application_limit": number,"pass_reminder_days": number
            }[]
                           },
"purge_list_entry":
{ Args: { "id": string,"list": Database["public"]['Enums']["import_list"] }; Returns: undefined
                           },
"record_refund":
{ Args: { "p_refunded_at": string,"p_refunded_cents": number,"p_session_id": string }; Returns: Json
                           },
"registration_info":
{ Args: Record<PropertyKey, never>; Returns: {
              "confirmation_resend_limit": number,"pilot_plan": Database["public"]['Enums']["plan_level"],"pilot_until": string,"registration_mode": Database["public"]['Enums']["registration_mode"],"sales_enabled": boolean
            }[]
                           }
          }
          Enums: {
            "access_source": "none"|"pass"|"manual","account_grant": "none"|"starter"|"plus","agency_model": "direct"|"temp"|"both","application_source": "job_board"|"company_list"|"job_list"|"agency"|"direct"|"referral"|"other","application_status": "planned"|"applied"|"interview"|"offer"|"accepted"|"rejected"|"no_response"|"withdrawn","article_area": "cv"|"linkedin"|"interview"|"guide"|"agencies"|"contract","checklist_area": "cv"|"linkedin"|"checklist"|"arrival"|"applications"|"jobs"|"companies"|"boards"|"agencies"|"german"|"knowledge"|"contract"|"start"|"search"|"preparation"|"found","company_signal": "english_ads"|"relocation_support"|"visa_support"|"recognition_partnership","email_kind": "reminder_next_step"|"interview_tomorrow"|"pass_ending"|"pass_ended"|"pass_started","employer_type": "hospital"|"care_home"|"outpatient","import_list": "companies"|"jobs"|"agencies"|"job_boards","industry": "it"|"engineering"|"nursing_care"|"healthcare"|"logistics","list_status": "draft"|"published"|"archived","next_step_type": "apply"|"follow_up"|"interview"|"documents"|"decision"|"offer_reply"|"none","pass_length": "month"|"quarter","period_source": "pass"|"manual"|"pilot","phrase_category": "cover_letter"|"phone"|"interview"|"vocabulary","plan_level": "free"|"starter"|"plus","portal_language": "en"|"de","registration_mode": "open"|"invite","task_key": "cv"|"linkedin"|"xing"|"visa","template_format": "docx"|"pdf"|"xlsx","user_role": "candidate"|"admin"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "access_source": ["none", "pass", "manual"],"account_grant": ["none", "starter", "plus"],"agency_model": ["direct", "temp", "both"],"application_source": ["job_board", "company_list", "job_list", "agency", "direct", "referral", "other"],"application_status": ["planned", "applied", "interview", "offer", "accepted", "rejected", "no_response", "withdrawn"],"article_area": ["cv", "linkedin", "interview", "guide", "agencies", "contract"],"checklist_area": ["cv", "linkedin", "checklist", "arrival", "applications", "jobs", "companies", "boards", "agencies", "german", "knowledge", "contract", "start", "search", "preparation", "found"],"company_signal": ["english_ads", "relocation_support", "visa_support", "recognition_partnership"],"email_kind": ["reminder_next_step", "interview_tomorrow", "pass_ending", "pass_ended", "pass_started"],"employer_type": ["hospital", "care_home", "outpatient"],"import_list": ["companies", "jobs", "agencies", "job_boards"],"industry": ["it", "engineering", "nursing_care", "healthcare", "logistics"],"list_status": ["draft", "published", "archived"],"next_step_type": ["apply", "follow_up", "interview", "documents", "decision", "offer_reply", "none"],"pass_length": ["month", "quarter"],"period_source": ["pass", "manual", "pilot"],"phrase_category": ["cover_letter", "phone", "interview", "vocabulary"],"plan_level": ["free", "starter", "plus"],"portal_language": ["en", "de"],"registration_mode": ["open", "invite"],"task_key": ["cv", "linkedin", "xing", "visa"],"template_format": ["docx", "pdf", "xlsx"],"user_role": ["candidate", "admin"]
          }
        }
} as const
