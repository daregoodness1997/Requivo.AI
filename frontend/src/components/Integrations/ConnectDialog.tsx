import { useState } from 'react';
import {
  Building2,
  BookOpen,
  Mail,
  Globe,
  Database,
  Cloud,
  Receipt,
  Blocks,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import Alert from '@/components/ui/Alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import Spinner from '@/components/ui/Spinner';
import { integrationsApi } from '@/api/integrations';
import { getErrorMessage } from '@/lib/errors';
import type { ErpConnection } from '@/types';

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

interface ConnectDialogProps {
  provider: ErpProvider | null;
  open: boolean;
  onClose: () => void;
  onConnected: (connection: ErpConnection) => void;
}

export default function ConnectDialog({
  provider,
  open,
  onClose,
  onConnected,
}: ConnectDialogProps) {
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [baseUrl, setBaseUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!provider) return null;

  const Icon = provider.icon;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const trimmedCredentials: Record<string, string> = {};
    for (const [k, v] of Object.entries(credentials)) {
      if (v.trim()) trimmedCredentials[k] = v.trim();
    }

    try {
      const result = await integrationsApi.connect({
        providerId: provider.id,
        providerName: provider.name,
        baseUrl: baseUrl.trim() || undefined,
        credentials: Object.keys(trimmedCredentials).length > 0 ? trimmedCredentials : undefined,
      });
      onConnected(result);
      resetAndClose();
    } catch (err) {
      setError(getErrorMessage(err, `Failed to connect to ${provider.name}.`));
    } finally {
      setLoading(false);
    }
  };

  const resetAndClose = () => {
    setCredentials({});
    setBaseUrl('');
    setError(null);
    setLoading(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && resetAndClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span
              className={`flex size-8 items-center justify-center rounded-lg bg-slate-100 ring-1 ring-slate-200 ${provider.color}`}
            >
              <Icon className="size-4" />
            </span>
            Connect to {provider.name}
          </DialogTitle>
          <DialogDescription>{provider.description}</DialogDescription>
        </DialogHeader>

        <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-700">
            <ShieldCheck className="size-3.5 text-slate-500" />
            Permissions requested
          </div>
          <ul className="space-y-1">
            {provider.permissions.map((perm) => (
              <li key={perm} className="flex items-start gap-2 text-xs text-slate-600">
                <span className="mt-0.5 size-1.5 shrink-0 rounded-full bg-slate-400" />
                {perm}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-semibold text-amber-800">{provider.authMethod}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-amber-700">
            {provider.authDescription}
          </p>
          {provider.authHelpUrl && (
            <a
              href={provider.authHelpUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 hover:text-amber-800"
            >
              <ExternalLink className="size-3" />
              View documentation
            </a>
          )}
        </div>

        {error && (
          <Alert role="alert" tone="danger">
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          {provider.urlField && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">
                {provider.urlField.label}
                {provider.urlField.required && <span className="ml-1 text-xs text-red-500">*</span>}
              </label>
              <Input
                type="url"
                placeholder={provider.urlField.placeholder}
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                disabled={loading}
              />
              {provider.urlField.helpText && (
                <p className="text-[11px] text-slate-400">{provider.urlField.helpText}</p>
              )}
            </div>
          )}

          {provider.credentialFields.map((field) => (
            <div key={field.key} className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">
                {field.label}
                {field.required && <span className="ml-1 text-xs text-red-500">*</span>}
              </label>
              <Input
                type={field.type}
                placeholder={field.placeholder}
                value={credentials[field.key] ?? ''}
                onChange={(e) =>
                  setCredentials((prev) => ({ ...prev, [field.key]: e.target.value }))
                }
                disabled={loading}
              />
              {field.helpText && <p className="text-[11px] text-slate-400">{field.helpText}</p>}
            </div>
          ))}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={resetAndClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={loading}>
              {loading ? <Spinner className="size-3.5" /> : <Icon className="size-3.5" />}
              Connect
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
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
