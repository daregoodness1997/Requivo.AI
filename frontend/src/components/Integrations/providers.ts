import {
  Building2,
  BookOpen,
  Mail,
  Globe,
  Database,
  Cloud,
  Receipt,
  Blocks,
} from 'lucide-react';

interface CredentialField {
  key: string;
  label: string;
  placeholder: string;
  required: boolean;
  type: 'text' | 'password' | 'url';
  helpText?: string;
}

interface UrlField {
  label: string;
  placeholder: string;
  required: boolean;
  helpText?: string;
}

export interface ErpProvider {
  id: string;
  name: string;
  description: string;
  icon: typeof Building2;
  color: string;
  authMethod: string;
  authDescription: string;
  authHelpUrl?: string;
  permissions: string[];
  credentialFields: CredentialField[];
  urlField?: UrlField;
}

export const providers: ErpProvider[] = [
  {
    id: 'sap',
    name: 'SAP S/4HANA',
    description: 'Connect to SAP S/4HANA Cloud for procurement, finance, and inventory management.',
    icon: Building2,
    color: 'text-blue-600',
    authMethod: 'OAuth 2.0 Client Credentials',
    authDescription:
      'SAP S/4HANA Cloud uses OAuth 2.0 Client Credentials for server-to-server API access. Create a Communication Arrangement in your SAP tenant to obtain these credentials.',
    authHelpUrl: 'https://help.sap.com/docs/SAP_S4HANA_CLOUD',
    permissions: [
      'Read and write procurement orders and vendor data',
      'Read and write inventory stock levels',
      'Read financial postings and cost center data',
      'Submit purchase requisitions',
    ],
    credentialFields: [
      {
        key: 'clientId',
        label: 'Client ID',
        placeholder: 'OAuth client ID from Communication Arrangement',
        required: true,
        type: 'text',
        helpText: 'Found in your SAP Communication Arrangement details',
      },
      {
        key: 'clientSecret',
        label: 'Client Secret',
        placeholder: 'OAuth client secret from Communication Arrangement',
        required: true,
        type: 'password',
      },
    ],
    urlField: {
      label: 'Token Endpoint URL',
      placeholder: 'https://your-s4hana.sap.com/oauth2/token',
      required: true,
      helpText: 'The OAuth token endpoint from your Communication Arrangement',
    },
  },
  {
    id: 'quickbooks',
    name: 'QuickBooks',
    description: 'Sync invoices, expenses, and financial data with QuickBooks Online.',
    icon: BookOpen,
    color: 'text-green-600',
    authMethod: 'OAuth 2.0 Authorization Code',
    authDescription:
      'QuickBooks Online uses OAuth 2.0. Register your app in the Intuit Developer Portal to obtain Client ID and Secret. Users are redirected to Intuit\u2019s consent screen to authorize access.',
    authHelpUrl:
      'https://developer.intuit.com/docs/0100_quickbooks_online/0200_dev_guides/auth/oauth_2_0',
    permissions: [
      'Read and write invoices and sales receipts',
      'Read expense and payment data',
      'Read financial reports and balances',
      'Manage vendor and customer records',
    ],
    credentialFields: [
      {
        key: 'clientId',
        label: 'Client ID',
        placeholder: 'From Intuit Developer Portal',
        required: true,
        type: 'text',
        helpText: 'Created when you register your app at developer.intuit.com',
      },
      {
        key: 'clientSecret',
        label: 'Client Secret',
        placeholder: 'From Intuit Developer Portal',
        required: true,
        type: 'password',
      },
    ],
  },
  {
    id: 'zoho',
    name: 'Zoho',
    description: 'Integrate CRM, mail, and business workflows from Zoho.',
    icon: Mail,
    color: 'text-orange-500',
    authMethod: 'OAuth 2.0 Authorization Code',
    authDescription:
      'Zoho uses OAuth 2.0. Register your app in the Zoho API Console to obtain Client ID and Secret. Users are redirected to Zoho\u2019s consent screen.',
    authHelpUrl: 'https://www.zoho.com/developer/',
    permissions: [
      'Read and write CRM records (leads, contacts, deals)',
      'Read email messages and calendar events',
      'Read contact directory data',
    ],
    credentialFields: [
      {
        key: 'clientId',
        label: 'Client ID',
        placeholder: 'From Zoho API Console',
        required: true,
        type: 'text',
        helpText: 'Register at api-console.zoho.com',
      },
      {
        key: 'clientSecret',
        label: 'Client Secret',
        placeholder: 'From Zoho API Console',
        required: true,
        type: 'password',
      },
    ],
  },
  {
    id: 'netsuite',
    name: 'Oracle NetSuite',
    description: 'Manage ERP, CRM, and e-commerce operations through NetSuite.',
    icon: Globe,
    color: 'text-red-500',
    authMethod: 'Token-Based Authentication (TBA)',
    authDescription:
      'NetSuite uses Token-Based Authentication (TBA) for REST API access. Create an Integration Record in your NetSuite account to obtain these credentials.',
    authHelpUrl:
      'https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/chapter_1540136360.html',
    permissions: [
      'Read and write sales orders and invoices',
      'Read inventory and fulfillment data',
      'Read financial statements and GL entries',
      'Manage customer and vendor records',
    ],
    credentialFields: [
      {
        key: 'accountId',
        label: 'Account ID',
        placeholder: 'e.g. TSTDRV1234567',
        required: true,
        type: 'text',
        helpText: 'Your NetSuite company/account ID',
      },
      {
        key: 'consumerKey',
        label: 'Consumer Key',
        placeholder: 'From NetSuite Integration Record',
        required: true,
        type: 'text',
      },
      {
        key: 'consumerSecret',
        label: 'Consumer Secret',
        placeholder: 'From NetSuite Integration Record',
        required: true,
        type: 'password',
      },
      {
        key: 'tokenId',
        label: 'Token ID',
        placeholder: 'From NetSuite Access Token',
        required: true,
        type: 'text',
      },
      {
        key: 'tokenSecret',
        label: 'Token Secret',
        placeholder: 'From NetSuite Access Token',
        required: true,
        type: 'password',
      },
    ],
    urlField: {
      label: 'REST Services URL',
      placeholder: 'https://1234567.restlets.api.netsuite.com',
      required: true,
      helpText: 'Your NetSuite RESTlets base URL (includes account ID)',
    },
  },
  {
    id: 'dynamics',
    name: 'Microsoft Dynamics 365',
    description: 'Integrate sales, customer service, and finance operations.',
    icon: Database,
    color: 'text-indigo-600',
    authMethod: 'OAuth 2.0 via Microsoft Entra ID',
    authDescription:
      'Dynamics 365 uses Microsoft Entra ID (Azure AD) for authentication. Register your app in the Entra ID portal, add API permissions, and obtain a Client ID and Secret.',
    authHelpUrl:
      'https://learn.microsoft.com/en-us/power-apps/developer/data-platform/authenticate-oauth',
    permissions: [
      'Read and write sales and opportunity data',
      'Read financial and supply chain data',
      'Manage customer service cases',
      'Access inventory and warehouse records',
    ],
    credentialFields: [
      {
        key: 'clientId',
        label: 'Client ID (Application ID)',
        placeholder: 'From Microsoft Entra ID App Registration',
        required: true,
        type: 'text',
        helpText: 'The Application (client) ID from your Entra ID registration',
      },
      {
        key: 'clientSecret',
        label: 'Client Secret',
        placeholder: 'From Certificates & secrets in Entra ID',
        required: true,
        type: 'password',
      },
      {
        key: 'tenantId',
        label: 'Tenant ID (Directory ID)',
        placeholder: 'e.g. 8f3b1d2c-4e5f-6a7b-8c9d-0e1f2a3b4c5d',
        required: true,
        type: 'text',
        helpText: 'The Directory (tenant) ID from your Entra ID overview',
      },
    ],
    urlField: {
      label: 'Instance URL',
      placeholder: 'https://yourorg.crm.dynamics.com',
      required: true,
      helpText: 'Your Dynamics 365 environment URL',
    },
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    description: 'Sync CRM data, sales pipelines, and customer analytics.',
    icon: Cloud,
    color: 'text-sky-500',
    authMethod: 'OAuth 2.0 Connected App',
    authDescription:
      'Salesforce uses OAuth 2.0 Connected Apps. Create a Connected App in Salesforce Setup to obtain Consumer Key and Secret. Users are redirected to Salesforce\u2019s consent screen.',
    authHelpUrl: 'https://help.salesforce.com/s/articleView?id=sf.remoteaccess_oauth_flows.htm',
    permissions: [
      'Read and write CRM records (leads, accounts, contacts)',
      'Access sales pipeline and opportunity data',
      'Read analytics and reporting dashboards',
    ],
    credentialFields: [
      {
        key: 'consumerKey',
        label: 'Consumer Key (Client ID)',
        placeholder: 'From Salesforce Connected App',
        required: true,
        type: 'text',
        helpText: 'Created in Setup > App Manager > New Connected App',
      },
      {
        key: 'consumerSecret',
        label: 'Consumer Secret (Client Secret)',
        placeholder: 'From Salesforce Connected App',
        required: true,
        type: 'password',
      },
    ],
    urlField: {
      label: 'Instance URL',
      placeholder: 'https://yourorg.my.salesforce.com',
      required: true,
      helpText: 'Your Salesforce org\u2019s login domain',
    },
  },
  {
    id: 'xero',
    name: 'Xero',
    description: 'Connect accounting, billing, and bank reconciliation data.',
    icon: Receipt,
    color: 'text-teal-600',
    authMethod: 'OAuth 2.0 with PKCE',
    authDescription:
      'Xero uses OAuth 2.0 with PKCE for secure authentication. Register your app in the Xero Developer Portal to obtain a Client ID. Users select organizations to connect on Xero\u2019s consent screen.',
    authHelpUrl: 'https://developer.xero.com/documentation/getting-started/getting-started-guide',
    permissions: [
      'Read and write invoices and bills',
      'Read bank transactions and balances',
      'Read financial reports',
      'Manage contacts and tracking categories',
    ],
    credentialFields: [
      {
        key: 'clientId',
        label: 'Client ID',
        placeholder: 'From Xero Developer Portal',
        required: true,
        type: 'text',
        helpText: 'Created at developer.xero.com > My Apps',
      },
      {
        key: 'clientSecret',
        label: 'Client Secret',
        placeholder: 'Optional for PKCE flow',
        required: false,
        type: 'password',
        helpText: 'Required only for confidential client flows; PKCE apps may omit this',
      },
    ],
  },
  {
    id: 'odoo',
    name: 'Odoo',
    description: 'Integrate open-source ERP modules including CRM, sales, and inventory.',
    icon: Blocks,
    color: 'text-purple-600',
    authMethod: 'XML-RPC / API Key',
    authDescription:
      'Odoo uses XML-RPC or JSON-RPC for external API access. Generate an API key in your Odoo user Preferences under Account Security. Provide your server URL, database name, and credentials.',
    authHelpUrl: 'https://www.odoo.com/documentation/18.0/developer/reference/external_api.html',
    permissions: [
      'Read and write sales orders and quotations',
      'Read inventory and stock movement data',
      'Read accounting and invoicing data',
      'Manage CRM leads and opportunities',
    ],
    credentialFields: [
      {
        key: 'database',
        label: 'Database Name',
        placeholder: 'e.g. mycompany',
        required: true,
        type: 'text',
        helpText: 'The Odoo database name (visible in Settings > General)',
      },
      {
        key: 'username',
        label: 'Username',
        placeholder: 'e.g. admin',
        required: true,
        type: 'text',
      },
      {
        key: 'apiKey',
        label: 'API Key',
        placeholder: 'Generated in Preferences > Account Security',
        required: true,
        type: 'password',
        helpText:
          'Since Odoo v14, use an API key instead of your password. Generate one in Preferences > Account Security.',
      },
    ],
    urlField: {
      label: 'Server URL',
      placeholder: 'https://yourcompany.odoo.com',
      required: true,
      helpText: 'Your Odoo instance URL (for Odoo Online or self-hosted)',
    },
  },
];
