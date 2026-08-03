// Idexal Cloud Gateway — model catalog
// The public model ids the gateway advertises and routes. Each maps onto
// upstream provider models via the router (idexal-1 → the best available
// open model, idexal-1-fast → a small fast model for planner/reviewer,
// idexal-embed-1 → embeddings).

export type ModelKind = 'chat' | 'embeddings';

export interface GatewayModel {
	/** Public model id clients request, e.g. "idexal-1". */
	id: string;
	kind: ModelKind;
	description: string;
	/** Minimum tier required: 'anonymous' or 'key' (higher quota tier). */
	tier: 'anonymous' | 'key';
	/** Default upstream model name this id maps to (overridable per upstream). */
	defaultUpstreamModel: string;
	/** True when the model is only served by keyed upstreams (BYOK-style). */
	requiresKeyUpstream?: boolean;
}

export const MODEL_CATALOG: GatewayModel[] = [
	{
		id: 'idexal-1',
		kind: 'chat',
		description: 'Smart routing to the best available open model (Llama-3.3-70B-class)',
		tier: 'anonymous',
		defaultUpstreamModel: 'llama3.1',
	},
	{
		id: 'idexal-1-fast',
		kind: 'chat',
		description: 'Small fast model for planner/reviewer roles',
		tier: 'anonymous',
		defaultUpstreamModel: 'llama3.2:3b',
	},
	{
		id: 'idexal-embed-1',
		kind: 'embeddings',
		description: 'Embeddings for semantic memory retrieval',
		tier: 'anonymous',
		defaultUpstreamModel: 'nomic-embed-text',
	},
];

export function getModel(id: string): GatewayModel | undefined {
	return MODEL_CATALOG.find((m) => m.id === id);
}

export function listModels(): GatewayModel[] {
	return MODEL_CATALOG;
}
