export interface Lead {
  id: string;
  companyId: string;
  name: string;
  phone?: string;
  email?: string;
  company?: string;
  source?: string;
  status: string;
  estimatedValue?: number;
  assignedTo?: string;
  notes?: string;
}

export interface Opportunity {
  id: string;
  companyId: string;
  leadId?: string;
  customerId?: string;
  name: string;
  value: number;
  stage: string;
  probability?: number;
  expectedCloseDate?: string;
  assignedTo?: string;
}

export interface Task {
  id: string;
  companyId: string;
  opportunityId?: string;
  leadId?: string;
  title: string;
  description?: string;
  dueDate?: string;
  priority: string;
  status: string;
  assignedTo?: string;
}
