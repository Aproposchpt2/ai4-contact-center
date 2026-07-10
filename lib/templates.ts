/**
 * templates.ts — Pre-built industry call flow templates
 * Each template has a name, industry tag, and ready-to-paste description.
 */

export interface CallFlowTemplate {
  id: string;
  name: string;
  industry: string;
  description: string;
  preview: string; // first line summary
}

export const TEMPLATES: CallFlowTemplate[] = [
  {
    id: 'university',
    name: 'University Call Center',
    industry: 'Higher Education',
    preview: 'Admissions, Financial Aid, IT Helpdesk, Registrar',
    description: `Main menu: 1 for Admissions, 2 for Financial Aid, 3 for IT Helpdesk, 4 for Registrar, 5 for Student Accounts.
After hours send to voicemail.
Holidays play special message.
If caller does not press a key, repeat menu twice then transfer to operator.`,
  },
  {
    id: 'healthcare',
    name: 'Healthcare Clinic',
    industry: 'Healthcare',
    preview: 'Appointments, Billing, Nurse Line, Pharmacy',
    description: `Main menu: 1 for Appointments, 2 for Billing, 3 for Nurse Line, 4 for Pharmacy, 5 for Medical Records.
After hours send urgent calls to on-call nurse line, all others to voicemail.
Holidays play special message directing callers to urgent care.
No input after two prompts routes to operator.`,
  },
  {
    id: 'retail',
    name: 'Retail / E-Commerce',
    industry: 'Retail',
    preview: 'Orders, Returns, Product Support, Store Locations',
    description: `Main menu: 1 for Order Status, 2 for Returns and Exchanges, 3 for Product Support, 4 for Store Locations and Hours.
After hours send to voicemail.
Holidays play special holiday hours message.
Repeat menu after 5 seconds of silence.`,
  },
  {
    id: 'government',
    name: 'Government Office',
    industry: 'Government',
    preview: 'Permits, Tax, Licensing, General Info',
    description: `Main menu: 1 for Permit Office, 2 for Tax and Revenue, 3 for Business Licensing, 4 for General Information, 5 for Emergency Services.
After hours send non-emergency calls to voicemail.
Holidays play closed message with alternative contact instructions.
Disconnect after two unanswered prompts.`,
  },
  {
    id: 'financial',
    name: 'Financial Services',
    industry: 'Finance',
    preview: 'Account Services, Loans, Fraud, Wire Transfers',
    description: `Main menu: 1 for Account Services, 2 for Loan Inquiries, 3 for Fraud and Security, 4 for Wire Transfers, 5 for Speak to a Representative.
After hours send account inquiries to automated account line, fraud calls transfer to 24-hour fraud hotline.
Holidays play message with emergency fraud line information.`,
  },
  {
    id: 'property',
    name: 'Property Management',
    industry: 'Real Estate',
    preview: 'Maintenance, Leasing, Payments, Emergency',
    description: `Main menu: 1 for Maintenance Requests, 2 for Leasing and New Rentals, 3 for Rent Payments, 4 for Emergency Maintenance.
After hours send maintenance emergencies to on-call technician, all others to voicemail.
Holidays play special message with emergency maintenance number.
Emergency option 4 routes directly to on-call at all hours.`,
  },
];
