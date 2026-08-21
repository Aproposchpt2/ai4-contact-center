import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAi4ccContext, apiErrorMessage, apiErrorStatus } from '@/lib/ai4ccServer';

const ENVIRONMENTS = ['dev', 'qa', 'staging', 'production'] as const;
type Environment = (typeof ENVIRONMENTS)[number];
type DestinationType = 'say' | 'voicemail';

type ValidationResult = {
  isValid: boolean;
  blockers: string[];
};

function isEnvironment(value: unknown): value is Environment {
  return typeof value === 'string' && (ENVIRONMENTS as readonly string[]).includes(value);
}

function validateDestinationDefinition(type: DestinationType, definition: unknown): ValidationResult {
  if (!definition || typeof definition !== 'object') {
    return { isValid: false, blockers: ['Destination definition is required.'] };
  }
  const record = definition as Record<string, unknown>;
  const blockers: string[] = [];

  if (record.type !== type) blockers.push(`Definition type must be ${type}.`);

  if (type === 'say') {
    if (typeof record.content !== 'string' || !record.content.trim()) {
      blockers.push('Customer-facing say content must be explicitly authored.');
    }
  }

  if (type === 'voicemail') {
    if (typeof record.greeting !== 'string' || !record.greeting.trim()) {
      blockers.push('Customer-facing voicemail greeting must be explicitly authored.');
    }
    const recording = record.recording;
    if (!recording || typeof recording !== 'object' || (recording as Record<string, unknown>).enabled !== true) {
      blockers.push('Voicemail recording must be explicitly enabled.');
    }
  }

  return { isValid: blockers.length === 0, blockers };
}

async function listDestinations(admin: any, tenantId: string) {
  const { data: destinations, error: destinationError } = await admin
    .from('ai4cc_voice_destinations')
    .select('id,name,description,destination_type,status,current_version,created_at,updated_at')
    .eq('tenant_id', tenantId)
    .order('name', { ascending: true });
  if (destinationError) throw destinationError;

  const ids = (destinations ?? []).map((row: any) => row.id);
  if (ids.length === 0) return [];

  const [{ data: versions, error: versionError }, { data: deployments, error: deploymentError }] = await Promise.all([
    admin
      .from('ai4cc_voice_destination_versions')
      .select('id,destination_id,version,definition,validation_status,validation_report,notes,created_at')
      .in('destination_id', ids)
      .order('version', { ascending: false }),
    admin
      .from('ai4cc_voice_destination_deployments')
      .select('id,destination_id,destination_version_id,environment,status,deployed_at')
      .eq('tenant_id', tenantId)
      .in('destination_id', ids)
      .order('deployed_at', { ascending: false }),
  ]);
  if (versionError) throw versionError;
  if (deploymentError) throw deploymentError;

  return (destinations ?? []).map((destination: any) => ({
    ...destination,
    versions: (versions ?? []).filter((version: any) => version.destination_id === destination.id),
    deployments: (deployments ?? []).filter((deployment: any) => deployment.destination_id === destination.id),
  }));
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { admin, userId, tenantId } = await requireAi4ccContext(req);

    if (req.method === 'GET') {
      return res.status(200).json({ destinations: await listDestinations(admin, tenantId) });
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'GET or POST only' });

    const action = req.body?.action as string | undefined;

    if (action === 'create_destination') {
      const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
      const description = typeof req.body?.description === 'string' ? req.body.description.trim() : null;
      const destinationType = req.body?.destinationType as DestinationType | undefined;
      if (!name || (destinationType !== 'say' && destinationType !== 'voicemail')) {
        return res.status(400).json({ error: 'name and valid destinationType are required' });
      }

      const { data, error } = await admin
        .from('ai4cc_voice_destinations')
        .insert({
          tenant_id: tenantId,
          name,
          description,
          destination_type: destinationType,
          status: 'draft',
          current_version: 1,
          created_by: userId,
        })
        .select('id,name,destination_type,status,current_version')
        .single();
      if (error) throw error;

      await admin.from('ai4cc_audit_logs').insert({
        tenant_id: tenantId,
        actor_user_id: userId,
        action: 'voice_destination.created',
        resource_type: 'voice_destination',
        resource_id: data.id,
        payload: { name, destination_type: destinationType },
      });
      return res.status(201).json({ destination: data });
    }

    if (action === 'create_version') {
      const destinationId = req.body?.destinationId as string | undefined;
      const definition = req.body?.definition as Record<string, unknown> | undefined;
      const notes = typeof req.body?.notes === 'string' ? req.body.notes.trim() : null;
      if (!destinationId || !definition) return res.status(400).json({ error: 'destinationId and definition are required' });

      const { data: destination, error: destinationError } = await admin
        .from('ai4cc_voice_destinations')
        .select('id,name,destination_type,current_version')
        .eq('tenant_id', tenantId)
        .eq('id', destinationId)
        .maybeSingle();
      if (destinationError) throw destinationError;
      if (!destination) return res.status(404).json({ error: 'Voice destination not found' });

      const validation = validateDestinationDefinition(destination.destination_type as DestinationType, definition);
      const { data: latest, error: latestError } = await admin
        .from('ai4cc_voice_destination_versions')
        .select('version')
        .eq('destination_id', destinationId)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (latestError) throw latestError;
      const nextVersion = (latest?.version ?? 0) + 1;

      const { data: version, error: versionError } = await admin
        .from('ai4cc_voice_destination_versions')
        .insert({
          destination_id: destinationId,
          version: nextVersion,
          definition,
          validation_status: validation.isValid ? 'passed' : 'blocked',
          validation_report: { ...validation, validatedAt: new Date().toISOString() },
          notes,
          created_by: userId,
        })
        .select('id,destination_id,version,definition,validation_status,validation_report,notes,created_at')
        .single();
      if (versionError) throw versionError;

      const { error: updateError } = await admin
        .from('ai4cc_voice_destinations')
        .update({ current_version: nextVersion, updated_at: new Date().toISOString() })
        .eq('tenant_id', tenantId)
        .eq('id', destinationId);
      if (updateError) throw updateError;

      await admin.from('ai4cc_audit_logs').insert({
        tenant_id: tenantId,
        actor_user_id: userId,
        action: 'voice_destination.version_created',
        resource_type: 'voice_destination_version',
        resource_id: version.id,
        payload: {
          destination_id: destinationId,
          destination_name: destination.name,
          version: nextVersion,
          validation_status: version.validation_status,
          blockers: validation.blockers,
        },
      });
      return res.status(201).json({ version, validation });
    }

    if (action === 'deploy') {
      const versionId = req.body?.versionId as string | undefined;
      const environment = req.body?.environment as Environment | undefined;
      if (!versionId || !isEnvironment(environment)) return res.status(400).json({ error: 'versionId and valid environment are required' });

      const { data: version, error: versionError } = await admin
        .from('ai4cc_voice_destination_versions')
        .select('id,destination_id,version,definition,validation_status,validation_report,ai4cc_voice_destinations!inner(id,tenant_id,name,destination_type)')
        .eq('id', versionId)
        .eq('ai4cc_voice_destinations.tenant_id', tenantId)
        .maybeSingle();
      if (versionError) throw versionError;
      if (!version) return res.status(404).json({ error: 'Voice destination version not found' });
      if (version.validation_status !== 'passed') return res.status(400).json({ error: 'Only validated destination versions can be deployed' });

      const destination = version.ai4cc_voice_destinations as any;
      const previousEnvironment: Partial<Record<Environment, Environment>> = {
        qa: 'dev',
        staging: 'qa',
        production: 'staging',
      };
      const sourceEnvironment = previousEnvironment[environment];
      if (sourceEnvironment) {
        const { data: source, error: sourceError } = await admin
          .from('ai4cc_voice_destination_deployments')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('destination_id', version.destination_id)
          .eq('destination_version_id', versionId)
          .eq('environment', sourceEnvironment)
          .eq('status', 'deployed')
          .maybeSingle();
        if (sourceError) throw sourceError;
        if (!source) return res.status(409).json({ error: `Exact destination version must be deployed in ${sourceEnvironment} before ${environment}` });
      }

      const { error: retireError } = await admin
        .from('ai4cc_voice_destination_deployments')
        .update({ status: 'retired' })
        .eq('tenant_id', tenantId)
        .eq('destination_id', version.destination_id)
        .eq('environment', environment)
        .eq('status', 'deployed');
      if (retireError) throw retireError;

      const snapshot = {
        destination_id: version.destination_id,
        destination_name: destination.name,
        destination_type: destination.destination_type,
        version: version.version,
        definition: version.definition,
        validation: version.validation_report,
      };
      const { data: deployment, error: deploymentError } = await admin
        .from('ai4cc_voice_destination_deployments')
        .insert({
          tenant_id: tenantId,
          destination_id: version.destination_id,
          destination_version_id: versionId,
          environment,
          status: 'deployed',
          snapshot,
          deployed_by: userId,
        })
        .select('id,destination_id,destination_version_id,environment,status,deployed_at')
        .single();
      if (deploymentError) throw deploymentError;

      await admin
        .from('ai4cc_voice_destinations')
        .update({ status: 'active', current_version: version.version, updated_at: new Date().toISOString() })
        .eq('tenant_id', tenantId)
        .eq('id', version.destination_id);

      await admin.from('ai4cc_audit_logs').insert({
        tenant_id: tenantId,
        actor_user_id: userId,
        action: 'voice_destination.deployed',
        resource_type: 'voice_destination_deployment',
        resource_id: deployment.id,
        payload: {
          destination_id: version.destination_id,
          destination_name: destination.name,
          destination_version_id: versionId,
          version: version.version,
          environment,
          source_environment: sourceEnvironment ?? null,
        },
      });
      return res.status(200).json({ deployment });
    }

    return res.status(400).json({ error: 'Unsupported action' });
  } catch (error) {
    return res.status(apiErrorStatus(error)).json({ error: apiErrorMessage(error) });
  }
}
