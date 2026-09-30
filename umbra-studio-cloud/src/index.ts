import {
	createRemoteJWKSet,
	jwtVerify,
	type JWTPayload,
} from "jose";

interface Env {
	umbra_studio_production: D1Database;
	umbra_studio_media: R2Bucket;
}

type StudioRole = "primary_admin" | "admin" | "editor";

interface AuthenticatedStudioUser {
	id: string;
	email: string | null;
	displayName: string | null;
	role: StudioRole;
	token: JWTPayload;
}

const SUPABASE_URL = "https://dblwgpiiwkjhdegsindx.supabase.co";
const SUPABASE_ISSUER = `${SUPABASE_URL}/auth/v1`;
const SUPABASE_JWKS_URL = new URL(
	`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`,
);

const SUPABASE_JWKS = createRemoteJWKSet(SUPABASE_JWKS_URL);

const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Headers": "Content-Type, Authorization",
	"Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
};

function json(data: unknown, status = 200): Response {
	return Response.json(data, {
		status,
		headers: corsHeaders,
	});
}

function errorResponse(
	status: number,
	error: string,
	details?: unknown,
): Response {
	return json(
		{
			ok: false,
			error,
			...(details !== undefined ? { details } : {}),
		},
		status,
	);
}

function getBearerToken(request: Request): string | null {
	const authorization = request.headers.get("Authorization");

	if (!authorization) {
		return null;
	}

	const [scheme, token] = authorization.trim().split(/\s+/, 2);

	if (scheme?.toLowerCase() !== "bearer" || !token) {
		return null;
	}

	return token;
}

async function authenticate(
	request: Request,
	env: Env,
): Promise<AuthenticatedStudioUser> {
	const accessToken = getBearerToken(request);

	if (!accessToken) {
		throw new Response(
			JSON.stringify({
				ok: false,
				error: "Authentication required.",
			}),
			{
				status: 401,
				headers: {
					...corsHeaders,
					"Content-Type": "application/json",
				},
			},
		);
	}

	let payload: JWTPayload;

	try {
		const verified = await jwtVerify(accessToken, SUPABASE_JWKS, {
			issuer: SUPABASE_ISSUER,
			algorithms: ["ES256"],
		});

		payload = verified.payload;
	} catch (failure) {
		console.error("JWT verification failed:", failure);

		throw new Response(
			JSON.stringify({
				ok: false,
				error:
					"Your Umbra Studio login session could not be verified. Please sign out and sign in again.",
			}),
			{
				status: 401,
				headers: {
					...corsHeaders,
					"Content-Type": "application/json",
				},
			},
		);
	}

	const userId =
		typeof payload.sub === "string" ? payload.sub.trim() : "";

	if (!userId) {
		throw new Response(
			JSON.stringify({
				ok: false,
				error: "Authenticated token does not contain a user ID.",
			}),
			{
				status: 401,
				headers: {
					...corsHeaders,
					"Content-Type": "application/json",
				},
			},
		);
	}

	const account = await env.umbra_studio_production
		.prepare(`
			SELECT
				u.id,
				u.email,
				u.display_name,
				u.auth_status,
				a.role
			FROM studio_users u
			INNER JOIN studio_admin_members a
				ON a.user_id = u.id
			WHERE u.id = ?
			LIMIT 1
		`)
		.bind(userId)
		.first<{
			id: string;
			email: string | null;
			display_name: string | null;
			auth_status: string;
			role: string;
		}>();

	if (!account) {
		throw new Response(
			JSON.stringify({
				ok: false,
				error: "This account does not have Umbra Studio access.",
			}),
			{
				status: 403,
				headers: {
					...corsHeaders,
					"Content-Type": "application/json",
				},
			},
		);
	}

	if (account.auth_status !== "active") {
		throw new Response(
			JSON.stringify({
				ok: false,
				error: "This Umbra Studio account is not active.",
			}),
			{
				status: 403,
				headers: {
					...corsHeaders,
					"Content-Type": "application/json",
				},
			},
		);
	}

	if (
		account.role !== "primary_admin" &&
		account.role !== "admin" &&
		account.role !== "editor"
	) {
		throw new Response(
			JSON.stringify({
				ok: false,
				error: "Umbra Studio role is invalid.",
			}),
			{
				status: 403,
				headers: {
					...corsHeaders,
					"Content-Type": "application/json",
				},
			},
		);
	}

	return {
		id: account.id,
		email: account.email,
		displayName: account.display_name,
		role: account.role as StudioRole,
		token: payload,
	};
}


function requireRole(
	user: AuthenticatedStudioUser,
	allowed: StudioRole[],
): void {
	if (!allowed.includes(user.role)) {
		throw new Response(
			JSON.stringify({ ok: false, error: "You do not have permission to perform this action." }),
			{ status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
		);
	}
}

async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
	try {
		const body = await request.json();
		if (!body || typeof body !== "object" || Array.isArray(body)) {
			throw new Error("Invalid JSON object.");
		}
		return body as Record<string, unknown>;
	} catch {
		throw new Response(
			JSON.stringify({ ok: false, error: "A valid JSON request body is required." }),
			{ status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
		);
	}
}

function jsonText(value: unknown, fallback: unknown): string {
	if (value === undefined) return JSON.stringify(fallback);
	if (typeof value === "string") {
		try { JSON.parse(value); return value; } catch { return JSON.stringify(fallback); }
	}
	return JSON.stringify(value ?? fallback);
}

function boolInt(value: unknown, fallback = 0): number {
	if (value === undefined) return fallback;
	return value === true || value === 1 || value === "1" ? 1 : 0;
}

function nullableString(value: unknown): string | null {
	if (value === undefined || value === null || value === "") return null;
	return String(value);
}

async function getAll(
	env: Env,
	sql: string,
	bindings: unknown[] = [],
): Promise<unknown[]> {
	let statement = env.umbra_studio_production.prepare(sql);

	if (bindings.length > 0) {
		statement = statement.bind(...bindings);
	}

	const result = await statement.all();

	return result.results ?? [];
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);

		if (request.method === "OPTIONS") {
			return new Response(null, {
				status: 204,
				headers: corsHeaders,
			});
		}

		try {
			// ------------------------------------------------------------
			// PUBLIC HEALTH ROUTES
			// ------------------------------------------------------------

			if (
				request.method === "GET" &&
				(url.pathname === "/" || url.pathname === "/health")
			) {
				return json({
					ok: true,
					service: "Umbra Studio Cloud",
					status: "online",
					version: "1.1.0",
				});
			}

			if (
				request.method === "GET" &&
				url.pathname === "/api/database/health"
			) {
				const tableResult = await env.umbra_studio_production
					.prepare(`
						SELECT COUNT(*) AS count
						FROM sqlite_master
						WHERE type = 'table'
						  AND name LIKE 'studio_%'
					`)
					.first<{ count: number }>();

				const characterResult = await env.umbra_studio_production
					.prepare(`
						SELECT COUNT(*) AS count
						FROM studio_characters
					`)
					.first<{ count: number }>();

				const revisionResult = await env.umbra_studio_production
					.prepare(`
						SELECT COUNT(*) AS count
						FROM studio_revisions
					`)
					.first<{ count: number }>();

				return json({
					ok: true,
					database: "umbra-studio-production",
					status: "connected",
					studioTables: Number(tableResult?.count ?? 0),
					characters: Number(characterResult?.count ?? 0),
					revisions: Number(revisionResult?.count ?? 0),
				});
			}

			// ------------------------------------------------------------
			// R2 MEDIA DELIVERY
			// R2 stays private; the Worker serves only exact requested object keys.
			// ------------------------------------------------------------
			if (request.method === "GET" && url.pathname.startsWith("/api/media/file/")) {
				const encodedKey = url.pathname.slice("/api/media/file/".length);
				let key = "";
				try { key = decodeURIComponent(encodedKey); }
				catch { return json({ error: "Invalid media key." }, 400); }

				if (!key.startsWith("media/") || key.includes("..")) {
					return json({ error: "Invalid media key." }, 400);
				}

				const object = await env.umbra_studio_media.get(key);
				if (!object) return json({ error: "Media not found." }, 404);

				const headers = new Headers();
				object.writeHttpMetadata(headers);
				headers.set("etag", object.httpEtag);
				headers.set("Cache-Control", "public, max-age=3600");
				headers.set("Access-Control-Allow-Origin", "*");
				return new Response(object.body, { headers });
			}

			// Everything below here requires a valid Umbra Studio account.
			const user = await authenticate(request, env);

			// ------------------------------------------------------------
			// R2 MEDIA WRITE API
			// ------------------------------------------------------------
			if (request.method === "POST" && url.pathname === "/api/media/upload") {
				const contentType = request.headers.get("content-type") || "";
				if (!contentType.includes("multipart/form-data")) {
					return json({ error: "Expected multipart form data." }, 400);
				}

				const form = await request.formData();
				const file = form.get("file");
				const categoryRaw = String(form.get("category") || "misc");

				if (!(file instanceof File)) return json({ error: "A media file is required." }, 400);
				if (file.size <= 0 || file.size > 20 * 1024 * 1024) {
					return json({ error: "Media files must be between 1 byte and 20 MB." }, 400);
				}

				const cleanPath = (value: string) =>
					value.replace(/\\/g, "/").split("/")
						.map((part) => part.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, ""))
						.filter(Boolean).join("/");

				const category = cleanPath(categoryRaw) || "misc";
				const originalName = cleanPath(file.name).split("/").pop() || "media.bin";
				const key = `media/cloud/${user.id}/${category}/${Date.now()}-${crypto.randomUUID()}-${originalName}`;

				await env.umbra_studio_media.put(key, file.stream(), {
					httpMetadata: {
						contentType: file.type || "application/octet-stream",
						cacheControl: "public, max-age=3600",
					},
					customMetadata: { uploadedBy: user.id, originalName: file.name },
				});

				return json({
					ok: true,
					key,
					url: `${url.origin}/api/media/file/${encodeURIComponent(key)}`,
					size: file.size,
					contentType: file.type || "application/octet-stream",
				}, 201);
			}

			if (request.method === "DELETE" && url.pathname.startsWith("/api/media/object/")) {
				requireRole(user, ["primary_admin", "admin"]);
				const encodedKey = url.pathname.slice("/api/media/object/".length);
				let key = "";
				try { key = decodeURIComponent(encodedKey); }
				catch { return json({ error: "Invalid media key." }, 400); }

				if (!key.startsWith("media/") || key.includes("..")) {
					return json({ error: "Invalid media key." }, 400);
				}
				await env.umbra_studio_media.delete(key);
				return json({ ok: true, key });
			}


			// ------------------------------------------------------------
			// CURRENT USER
			// ------------------------------------------------------------

			if (
				request.method === "GET" &&
				url.pathname === "/api/me"
			) {
				return json({
					ok: true,
					user: {
						id: user.id,
						email: user.email,
						displayName: user.displayName,
						role: user.role,
					},
				});
			}

			// ------------------------------------------------------------
			// CHARACTERS
			// ------------------------------------------------------------

			if (
				request.method === "GET" &&
				url.pathname === "/api/characters"
			) {
				const rows = await getAll(
					env,
					`
						SELECT *
						FROM studio_characters
						ORDER BY name COLLATE NOCASE ASC
					`,
				);

				return json({
					ok: true,
					count: rows.length,
					characters: rows,
				});
			}

			// ------------------------------------------------------------
			// WORLD / CODEX RECORDS
			// ------------------------------------------------------------

			if (
				request.method === "GET" &&
				url.pathname === "/api/world-records"
			) {
				const rows = await getAll(
					env,
					`
						SELECT *
						FROM studio_world_records
						ORDER BY name COLLATE NOCASE ASC
					`,
				);

				return json({
					ok: true,
					count: rows.length,
					records: rows,
				});
			}

			// ------------------------------------------------------------
			// LOCATIONS
			// ------------------------------------------------------------

			if (
				request.method === "GET" &&
				url.pathname === "/api/locations"
			) {
				const rows = await getAll(
					env,
					`
						SELECT *
						FROM studio_world_locations
						ORDER BY name COLLATE NOCASE ASC
					`,
				);

				return json({
					ok: true,
					count: rows.length,
					locations: rows,
				});
			}

			// ------------------------------------------------------------
			// TIMELINE
			// ------------------------------------------------------------

			if (
				request.method === "GET" &&
				url.pathname === "/api/timeline"
			) {
				const rows = await getAll(
					env,
					`
						SELECT *
						FROM studio_timeline_events
						ORDER BY created_at DESC
					`,
				);

				return json({
					ok: true,
					count: rows.length,
					events: rows,
				});
			}


			// ------------------------------------------------------------
			// CORE WRITE API — v1.1.0
			// Editors may create/update. Destructive deletes require Admin.
			// ------------------------------------------------------------

			const characterMatch = url.pathname.match(/^\/api\/characters\/([^/]+)$/);
			if (request.method === "POST" && url.pathname === "/api/characters") {
				requireRole(user, ["primary_admin", "admin", "editor"]);
				const b = await readJsonBody(request);
				const id = typeof b.id === "string" && b.id ? b.id : crypto.randomUUID();
				const name = String(b.name ?? "").trim();
				if (!name) return errorResponse(400, "Character name is required.");
				await env.umbra_studio_production.prepare(`
					INSERT INTO studio_characters
					(id,user_id,name,status,workflow_status,identity,appearance,origin_lore,abilities,relationships,media,portrait_url,current_step,is_complete,is_public,realm_record_id,race_record_id,faction_record_id,family_record_id,created_at,updated_at)
					VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
				`).bind(
					id,user.id,name,String(b.status ?? "draft"),String(b.workflow_status ?? "draft"),
					jsonText(b.identity,{}),jsonText(b.appearance,{}),jsonText(b.origin_lore,{}),
					jsonText(b.abilities,{}),jsonText(b.relationships,{}),jsonText(b.media,{}),
					nullableString(b.portrait_url),Number(b.current_step ?? 1),boolInt(b.is_complete),
					boolInt(b.is_public),nullableString(b.realm_record_id),nullableString(b.race_record_id),
					nullableString(b.faction_record_id),nullableString(b.family_record_id),
					new Date().toISOString(),new Date().toISOString()
				).run();
				return json({ok:true,id},201);
			}
			if (characterMatch && request.method === "PUT") {
				requireRole(user, ["primary_admin", "admin", "editor"]);
				const id = decodeURIComponent(characterMatch[1]);
				const b = await readJsonBody(request);
				const current = await env.umbra_studio_production
					.prepare("SELECT * FROM studio_characters WHERE id=?")
					.bind(id)
					.first<Record<string,unknown>>();

				// Imported/new characters may already have a stable Umbra Studio ID
				// before their first Cloud save. Preserve that ID and create the D1
				// record on first PUT; subsequent PUTs update the same record.
				if (!current) {
					const name = String(b.name ?? "").trim();
					if (!name) return errorResponse(400, "Character name is required.");

					const now = new Date().toISOString();
					await env.umbra_studio_production.prepare(`
						INSERT INTO studio_characters
						(id,user_id,name,status,workflow_status,identity,appearance,origin_lore,abilities,relationships,media,portrait_url,current_step,is_complete,is_public,realm_record_id,race_record_id,faction_record_id,family_record_id,created_at,updated_at)
						VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
					`).bind(
						id,
						user.id,
						name,
						String(b.status ?? "draft"),
						String(b.workflow_status ?? "draft"),
						jsonText(b.identity,{}),
						jsonText(b.appearance,{}),
						jsonText(b.origin_lore,{}),
						jsonText(b.abilities,{}),
						jsonText(b.relationships,{}),
						jsonText(b.media,{}),
						nullableString(b.portrait_url),
						Number(b.current_step ?? 1),
						boolInt(b.is_complete),
						boolInt(b.is_public),
						nullableString(b.realm_record_id),
						nullableString(b.race_record_id),
						nullableString(b.faction_record_id),
						nullableString(b.family_record_id),
						now,
						now,
					).run();

					return json({ok:true,id,action:"created"},201);
				}

				await env.umbra_studio_production.prepare(`
					UPDATE studio_characters SET
					name=?,status=?,workflow_status=?,identity=?,appearance=?,origin_lore=?,abilities=?,relationships=?,media=?,portrait_url=?,current_step=?,is_complete=?,is_public=?,realm_record_id=?,race_record_id=?,faction_record_id=?,family_record_id=?,updated_at=?
					WHERE id=?
				`).bind(
					String(b.name ?? current.name),String(b.status ?? current.status),String(b.workflow_status ?? current.workflow_status),
					b.identity===undefined?current.identity:jsonText(b.identity,{}),b.appearance===undefined?current.appearance:jsonText(b.appearance,{}),
					b.origin_lore===undefined?current.origin_lore:jsonText(b.origin_lore,{}),b.abilities===undefined?current.abilities:jsonText(b.abilities,{}),
					b.relationships===undefined?current.relationships:jsonText(b.relationships,{}),b.media===undefined?current.media:jsonText(b.media,{}),
					b.portrait_url===undefined?current.portrait_url:nullableString(b.portrait_url),Number(b.current_step ?? current.current_step ?? 1),
					b.is_complete===undefined?Number(current.is_complete ?? 0):boolInt(b.is_complete),b.is_public===undefined?Number(current.is_public ?? 0):boolInt(b.is_public),
					b.realm_record_id===undefined?current.realm_record_id:nullableString(b.realm_record_id),
					b.race_record_id===undefined?current.race_record_id:nullableString(b.race_record_id),
					b.faction_record_id===undefined?current.faction_record_id:nullableString(b.faction_record_id),
					b.family_record_id===undefined?current.family_record_id:nullableString(b.family_record_id),
					new Date().toISOString(),id
				).run();
				return json({ok:true,id,action:"updated"});
			}
			if (characterMatch && request.method === "DELETE") {
				requireRole(user, ["primary_admin", "admin"]);
				const id=decodeURIComponent(characterMatch[1]);
				await env.umbra_studio_production.prepare("DELETE FROM studio_characters WHERE id=?").bind(id).run();
				return json({ok:true,id});
			}

			const worldMatch = url.pathname.match(/^\/api\/world-records\/([^/]+)$/);
			if (request.method === "POST" && url.pathname === "/api/world-records") {
				requireRole(user, ["primary_admin","admin","editor"]);
				const b=await readJsonBody(request); const id=typeof b.id==="string"&&b.id?b.id:crypto.randomUUID();
				const name=String(b.name??"").trim(), recordType=String(b.record_type??"").trim();
				if(!name||!recordType) return errorResponse(400,"World record type and name are required.");
				await env.umbra_studio_production.prepare(`INSERT INTO studio_world_records
				(id,user_id,record_type,name,subtype,description,emblem_url,cover_url,lore_details,workflow_status,is_public,created_at,updated_at)
				VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id,user.id,recordType,name,nullableString(b.subtype),nullableString(b.description),
				nullableString(b.emblem_url),nullableString(b.cover_url),jsonText(b.lore_details,{}),String(b.workflow_status??"draft"),
				boolInt(b.is_public),new Date().toISOString(),new Date().toISOString()).run();
				return json({ok:true,id},201);
			}
			if(worldMatch && request.method==="PUT"){
				requireRole(user,["primary_admin","admin","editor"]); const id=decodeURIComponent(worldMatch[1]); const b=await readJsonBody(request);
				const c=await env.umbra_studio_production.prepare("SELECT * FROM studio_world_records WHERE id=?").bind(id).first<Record<string,unknown>>();
				if(!c)return errorResponse(404,"World record not found.");
				await env.umbra_studio_production.prepare(`UPDATE studio_world_records SET record_type=?,name=?,subtype=?,description=?,emblem_url=?,cover_url=?,lore_details=?,workflow_status=?,is_public=?,updated_at=? WHERE id=?`)
				.bind(String(b.record_type??c.record_type),String(b.name??c.name),b.subtype===undefined?c.subtype:nullableString(b.subtype),
				b.description===undefined?c.description:nullableString(b.description),b.emblem_url===undefined?c.emblem_url:nullableString(b.emblem_url),
				b.cover_url===undefined?c.cover_url:nullableString(b.cover_url),b.lore_details===undefined?c.lore_details:jsonText(b.lore_details,{}),
				String(b.workflow_status??c.workflow_status),b.is_public===undefined?Number(c.is_public??0):boolInt(b.is_public),new Date().toISOString(),id).run();
				return json({ok:true,id});
			}
			if(worldMatch && request.method==="DELETE"){
				requireRole(user,["primary_admin","admin"]); const id=decodeURIComponent(worldMatch[1]);
				await env.umbra_studio_production.prepare("DELETE FROM studio_world_records WHERE id=?").bind(id).run(); return json({ok:true,id});
			}

			const locationMatch=url.pathname.match(/^\/api\/locations\/([^/]+)$/);
			if(request.method==="POST"&&url.pathname==="/api/locations"){
				requireRole(user,["primary_admin","admin","editor"]); const b=await readJsonBody(request); const id=crypto.randomUUID();
				const name=String(b.name??"").trim(); if(!name)return errorResponse(400,"Location name is required.");
				await env.umbra_studio_production.prepare(`INSERT INTO studio_world_locations
				(id,user_id,name,location_type,description,parent_location_id,codex_record_id,map_x,map_y,image_url,tags,workflow_status,is_public,archived_at,created_at,updated_at)
				VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id,user.id,name,String(b.location_type??"other"),nullableString(b.description),
				nullableString(b.parent_location_id),nullableString(b.codex_record_id),b.map_x==null?null:Number(b.map_x),b.map_y==null?null:Number(b.map_y),
				nullableString(b.image_url),jsonText(b.tags,[]),String(b.workflow_status??"draft"),boolInt(b.is_public),nullableString(b.archived_at),
				new Date().toISOString(),new Date().toISOString()).run(); return json({ok:true,id},201);
			}
			if(locationMatch&&request.method==="PUT"){
				requireRole(user,["primary_admin","admin","editor"]); const id=decodeURIComponent(locationMatch[1]); const b=await readJsonBody(request);
				const c=await env.umbra_studio_production.prepare("SELECT * FROM studio_world_locations WHERE id=?").bind(id).first<Record<string,unknown>>();
				if(!c)return errorResponse(404,"Location not found.");
				await env.umbra_studio_production.prepare(`UPDATE studio_world_locations SET name=?,location_type=?,description=?,parent_location_id=?,codex_record_id=?,map_x=?,map_y=?,image_url=?,tags=?,workflow_status=?,is_public=?,archived_at=?,updated_at=? WHERE id=?`)
				.bind(String(b.name??c.name),String(b.location_type??c.location_type),b.description===undefined?c.description:nullableString(b.description),
				b.parent_location_id===undefined?c.parent_location_id:nullableString(b.parent_location_id),b.codex_record_id===undefined?c.codex_record_id:nullableString(b.codex_record_id),
				b.map_x===undefined?c.map_x:Number(b.map_x),b.map_y===undefined?c.map_y:Number(b.map_y),b.image_url===undefined?c.image_url:nullableString(b.image_url),
				b.tags===undefined?c.tags:jsonText(b.tags,[]),String(b.workflow_status??c.workflow_status),b.is_public===undefined?Number(c.is_public??0):boolInt(b.is_public),
				b.archived_at===undefined?c.archived_at:nullableString(b.archived_at),new Date().toISOString(),id).run(); return json({ok:true,id});
			}
			if(locationMatch&&request.method==="DELETE"){requireRole(user,["primary_admin","admin"]);const id=decodeURIComponent(locationMatch[1]);await env.umbra_studio_production.prepare("DELETE FROM studio_world_locations WHERE id=?").bind(id).run();return json({ok:true,id});}

			const timelineMatch=url.pathname.match(/^\/api\/timeline\/([^/]+)$/);
			if(request.method==="POST"&&url.pathname==="/api/timeline"){
				requireRole(user,["primary_admin","admin","editor"]); const b=await readJsonBody(request); const id=crypto.randomUUID();
				const title=String(b.title??"").trim();if(!title)return errorResponse(400,"Timeline title is required.");
				await env.umbra_studio_production.prepare(`INSERT INTO studio_timeline_events
				(id,user_id,title,era,display_date,sort_order,description,location_id,codex_record_id,character_id,image_url,tags,workflow_status,is_public,archived_at,created_at,updated_at)
				VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id,user.id,title,nullableString(b.era),nullableString(b.display_date),Number(b.sort_order??0),
				nullableString(b.description),nullableString(b.location_id),nullableString(b.codex_record_id),nullableString(b.character_id),nullableString(b.image_url),
				jsonText(b.tags,[]),String(b.workflow_status??"draft"),boolInt(b.is_public),nullableString(b.archived_at),new Date().toISOString(),new Date().toISOString()).run();
				return json({ok:true,id},201);
			}
			if(timelineMatch&&request.method==="PUT"){
				requireRole(user,["primary_admin","admin","editor"]);const id=decodeURIComponent(timelineMatch[1]);const b=await readJsonBody(request);
				const c=await env.umbra_studio_production.prepare("SELECT * FROM studio_timeline_events WHERE id=?").bind(id).first<Record<string,unknown>>();
				if(!c)return errorResponse(404,"Timeline event not found.");
				await env.umbra_studio_production.prepare(`UPDATE studio_timeline_events SET title=?,era=?,display_date=?,sort_order=?,description=?,location_id=?,codex_record_id=?,character_id=?,image_url=?,tags=?,workflow_status=?,is_public=?,archived_at=?,updated_at=? WHERE id=?`)
				.bind(String(b.title??c.title),b.era===undefined?c.era:nullableString(b.era),b.display_date===undefined?c.display_date:nullableString(b.display_date),
				Number(b.sort_order??c.sort_order??0),b.description===undefined?c.description:nullableString(b.description),b.location_id===undefined?c.location_id:nullableString(b.location_id),
				b.codex_record_id===undefined?c.codex_record_id:nullableString(b.codex_record_id),b.character_id===undefined?c.character_id:nullableString(b.character_id),
				b.image_url===undefined?c.image_url:nullableString(b.image_url),b.tags===undefined?c.tags:jsonText(b.tags,[]),String(b.workflow_status??c.workflow_status),
				b.is_public===undefined?Number(c.is_public??0):boolInt(b.is_public),b.archived_at===undefined?c.archived_at:nullableString(b.archived_at),new Date().toISOString(),id).run();
				return json({ok:true,id});
			}
			if(timelineMatch&&request.method==="DELETE"){requireRole(user,["primary_admin","admin"]);const id=decodeURIComponent(timelineMatch[1]);await env.umbra_studio_production.prepare("DELETE FROM studio_timeline_events WHERE id=?").bind(id).run();return json({ok:true,id});}


			// ------------------------------------------------------------
			// RELATIONSHIPS + FAMILY TREE
			// Manual links are authoritative.
			// ------------------------------------------------------------
			if (request.method === "GET" && url.pathname === "/api/relationships") {
				const sourceId = url.searchParams.get("sourceId");
				const familyOnly = url.searchParams.get("family") === "1";
				const familyTypes = ["parent","child","sibling","partner","mother","father","son","daughter","brother","sister","full_sibling","half_sibling","twin","twin_brother","twin_sister","spouse","husband","wife","fiance"];
				let sql = `SELECT * FROM studio_character_relationships WHERE is_deleted=0`;
				const bindings: unknown[] = [];
				if (sourceId) { sql += ` AND source_character_id=?`; bindings.push(sourceId); }
				if (familyOnly) { sql += ` AND relationship_type IN (${familyTypes.map(()=>"?").join(",")})`; bindings.push(...familyTypes); }
				sql += ` ORDER BY created_at ASC`;
				const rows = await getAll(env, sql, bindings);
				return json({ok:true,count:rows.length,relationships:rows});
			}

			if (request.method === "POST" && url.pathname === "/api/relationships") {
				requireRole(user, ["primary_admin","admin","editor"]);
				const b=await readJsonBody(request);
				const source=String(b.source_character_id??""), target=String(b.target_character_id??""), type=String(b.relationship_type??"");
				if(!source||!target||!type) return errorResponse(400,"Source, target, and relationship type are required.");
				if(source===target) return errorResponse(400,"A character cannot be connected to themselves.");
				const existing=await env.umbra_studio_production.prepare(`SELECT id FROM studio_character_relationships WHERE source_character_id=? AND target_character_id=? AND relationship_type=? LIMIT 1`).bind(source,target,type).first<{id:string}>();
				const id=existing?.id??crypto.randomUUID();
				if(existing){
					await env.umbra_studio_production.prepare(`UPDATE studio_character_relationships SET owner_user_id=?,relationship_source='manual',manual_override=1,is_locked=1,is_deleted=0,notes=?,updated_at=? WHERE id=?`)
					.bind(user.id,nullableString(b.notes),new Date().toISOString(),id).run();
				}else{
					await env.umbra_studio_production.prepare(`INSERT INTO studio_character_relationships
					(id,owner_user_id,source_character_id,target_character_id,relationship_type,relationship_source,manual_override,is_locked,is_deleted,notes,created_at,updated_at)
					VALUES(?,?,?,?,?,'manual',1,1,0,?,?,?)`)
					.bind(id,user.id,source,target,type,nullableString(b.notes),new Date().toISOString(),new Date().toISOString()).run();
				}
				return json({ok:true,id});
			}

			const relationshipMatch=url.pathname.match(/^\/api\/relationships\/([^/]+)$/);
			if(relationshipMatch&&request.method==="DELETE"){
				requireRole(user,["primary_admin","admin","editor"]);
				const id=decodeURIComponent(relationshipMatch[1]);
				await env.umbra_studio_production.prepare(`UPDATE studio_character_relationships SET is_deleted=1,manual_override=1,is_locked=1,relationship_source='manual',updated_at=? WHERE id=?`)
				.bind(new Date().toISOString(),id).run();
				return json({ok:true,id});
			}

			if(request.method==="POST"&&url.pathname==="/api/relationships/delete-pair"){
				requireRole(user,["primary_admin","admin","editor"]);
				const b=await readJsonBody(request);
				const source=String(b.source_character_id??""),target=String(b.target_character_id??""),type=String(b.relationship_type??"");
				if(!source||!target||!type)return errorResponse(400,"Source, target, and relationship type are required.");
				await env.umbra_studio_production.prepare(`UPDATE studio_character_relationships SET is_deleted=1,manual_override=1,is_locked=1,relationship_source='manual',updated_at=? WHERE source_character_id=? AND target_character_id=? AND relationship_type=?`)
				.bind(new Date().toISOString(),source,target,type).run();
				return json({ok:true});
			}

			if(request.method==="POST"&&url.pathname==="/api/relationships/clear-family"){
				requireRole(user,["primary_admin","admin","editor"]);
				const b=await readJsonBody(request); const id=String(b.character_id??"");
				if(!id)return errorResponse(400,"Character ID is required.");
				const familyTypes=["parent","child","sibling","partner"];
				await env.umbra_studio_production.prepare(`UPDATE studio_character_relationships SET is_deleted=1,manual_override=1,is_locked=1,relationship_source='manual',updated_at=? WHERE (source_character_id=? OR target_character_id=?) AND relationship_type IN (?,?,?,?)`)
				.bind(new Date().toISOString(),id,id,...familyTypes).run();
				return json({ok:true});
			}

			if(request.method==="GET"&&url.pathname.startsWith("/api/family-tree-layout/")){
				const centerId=decodeURIComponent(url.pathname.slice("/api/family-tree-layout/".length));
				const row=await env.umbra_studio_production.prepare(`SELECT * FROM studio_family_tree_layouts WHERE user_id=? AND center_character_id=? LIMIT 1`).bind(user.id,centerId).first<Record<string,unknown>>();
				return json({ok:true,layout:row??null});
			}
			if(request.method==="PUT"&&url.pathname.startsWith("/api/family-tree-layout/")){
				requireRole(user,["primary_admin","admin","editor"]);
				const centerId=decodeURIComponent(url.pathname.slice("/api/family-tree-layout/".length));
				if(!centerId)return errorResponse(400,"Center character ID is required.");
				const b=await readJsonBody(request);
				try{
					const existing=await env.umbra_studio_production
						.prepare(`SELECT id FROM studio_family_tree_layouts WHERE user_id=? AND center_character_id=? LIMIT 1`)
						.bind(user.id,centerId)
						.first<{id:string}>();
					if(existing?.id){
						await env.umbra_studio_production.prepare(`
							UPDATE studio_family_tree_layouts
							SET positions=?,hidden_ids=?,locked_ids=?,updated_at=?
							WHERE id=?
						`).bind(
							jsonText(b.positions,{}),
							jsonText(b.hidden_ids,[]),
							jsonText(b.locked_ids,[]),
							new Date().toISOString(),
							existing.id
						).run();
						return json({ok:true,id:existing.id,action:"updated"});
					}
					const id=crypto.randomUUID();
					await env.umbra_studio_production.prepare(`
						INSERT INTO studio_family_tree_layouts
						(id,user_id,center_character_id,positions,hidden_ids,locked_ids,updated_at)
						VALUES(?,?,?,?,?,?,?)
					`).bind(
						id,user.id,centerId,
						jsonText(b.positions,{}),
						jsonText(b.hidden_ids,[]),
						jsonText(b.locked_ids,[]),
						new Date().toISOString()
					).run();
					return json({ok:true,id,action:"created"},201);
				}catch(failure){
					const details=failure instanceof Error?failure.message:String(failure);
					console.error("Family Tree layout save failed:",{userId:user.id,centerId,details});
					return errorResponse(500,"Family Tree layout save failed.",details);
				}
			}

			if(request.method==="DELETE"&&url.pathname.startsWith("/api/family-tree-layout/")){
				requireRole(user,["primary_admin","admin","editor"]);
				const centerId=decodeURIComponent(url.pathname.slice("/api/family-tree-layout/".length));
				await env.umbra_studio_production.prepare(`DELETE FROM studio_family_tree_layouts WHERE user_id=? AND center_character_id=?`).bind(user.id,centerId).run();
				return json({ok:true});
			}


			// ------------------------------------------------------------
			// ADMIN CENTER + STUDIO SETTINGS + PRESENCE
			// ------------------------------------------------------------
			if(request.method==="GET"&&url.pathname==="/api/admin-center"){
				const [members,activity,revisions,notes,characters,codex,locations,events,sessions]=await Promise.all([
					getAll(env,`SELECT a.user_id,u.email,u.display_name,a.role,a.created_at,a.last_login_at,a.last_seen_at FROM studio_admin_members a JOIN studio_users u ON u.id=a.user_id ORDER BY a.created_at ASC`),
					getAll(env,`SELECT id,actor_user_id,actor_email,actor_name,action,entity_type,entity_id,entity_label,details,created_at FROM studio_activity_log ORDER BY created_at DESC LIMIT 100`),
					getAll(env,`SELECT id,entity_type,entity_id,entity_label,changed_by,changed_by_email,snapshot,created_at FROM studio_revisions ORDER BY created_at DESC LIMIT 100`),
					getAll(env,`SELECT id,entity_type,entity_id,note,created_by,created_by_email,created_at,updated_at FROM studio_admin_notes ORDER BY updated_at DESC LIMIT 100`),
					getAll(env,`SELECT id,user_id,name,workflow_status,updated_at FROM studio_characters ORDER BY updated_at DESC`),
					getAll(env,`SELECT id,user_id,name,workflow_status,updated_at FROM studio_world_records ORDER BY updated_at DESC`),
					getAll(env,`SELECT id,user_id,name,workflow_status,updated_at FROM studio_world_locations WHERE archived_at IS NULL ORDER BY updated_at DESC`),
					getAll(env,`SELECT id,user_id,title,workflow_status,updated_at FROM studio_timeline_events WHERE archived_at IS NULL ORDER BY updated_at DESC`),
					getAll(env,`SELECT * FROM studio_collaborator_sessions ORDER BY signed_in_at DESC LIMIT 200`)
				]);
				return json({ok:true,members,activity,revisions,notes,characters,codex,locations,events,sessions});
			}

			if(request.method==="POST"&&url.pathname==="/api/admin-notes"){
				requireRole(user,["primary_admin","admin","editor"]);
				const b=await readJsonBody(request);const note=String(b.note??"").trim();
				if(!note)return errorResponse(400,"Note text is required.");
				const id=crypto.randomUUID(),now=new Date().toISOString();
				await env.umbra_studio_production.prepare(`INSERT INTO studio_admin_notes(id,entity_type,entity_id,note,created_by,created_by_email,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)`)
				.bind(id,String(b.entity_type??"studio"),String(b.entity_id??"studio"),note,user.id,user.email,now,now).run();
				return json({ok:true,id},201);
			}
			const adminNoteMatch=url.pathname.match(/^\/api\/admin-notes\/([^/]+)$/);
			if(adminNoteMatch&&request.method==="DELETE"){
				requireRole(user,["primary_admin","admin","editor"]);
				const id=decodeURIComponent(adminNoteMatch[1]);
				const note=await env.umbra_studio_production.prepare(`SELECT created_by FROM studio_admin_notes WHERE id=?`).bind(id).first<{created_by:string}>();
				if(!note)return errorResponse(404,"Admin note not found.");
				if(user.role==="editor"&&note.created_by!==user.id)return errorResponse(403,"Editors can only delete their own admin notes.");
				await env.umbra_studio_production.prepare(`DELETE FROM studio_admin_notes WHERE id=?`).bind(id).run();
				return json({ok:true,id});
			}

			if(request.method==="GET"&&url.pathname==="/api/settings"){
				const row=await env.umbra_studio_production.prepare(`SELECT * FROM studio_settings WHERE id=1`).first<Record<string,unknown>>();
				return json({ok:true,settings:row??null});
			}
			if(request.method==="PUT"&&url.pathname==="/api/settings"){
				requireRole(user,["primary_admin"]);
				const b=await readJsonBody(request);
				await env.umbra_studio_production.prepare(`UPDATE studio_settings SET studio_name=?,studio_subtitle=?,default_canon_status=?,default_spoiler_level=?,autosave_enabled=?,autosave_seconds=?,stale_session_minutes=?,show_dashboard_activity=?,show_help_descriptions=?,updated_at=? WHERE id=1`)
				.bind(String(b.studio_name??"Umbra Studio"),nullableString(b.studio_subtitle),String(b.default_canon_status??"draft"),String(b.default_spoiler_level??"none"),
				boolInt(b.autosave_enabled,1),Math.max(5,Number(b.autosave_seconds??20)),Math.max(1,Number(b.stale_session_minutes??30)),
				boolInt(b.show_dashboard_activity,1),boolInt(b.show_help_descriptions,1),new Date().toISOString()).run();
				return json({ok:true});
			}

			if(request.method==="POST"&&url.pathname==="/api/sessions"){
				const id=crypto.randomUUID(),now=new Date().toISOString();
				await env.umbra_studio_production.prepare(`INSERT INTO studio_collaborator_sessions(id,user_id,display_name,email,role,signed_in_at,last_seen_at) VALUES(?,?,?,?,?,?,?)`)
				.bind(id,user.id,user.displayName,user.email,user.role,now,now).run();
				await env.umbra_studio_production.prepare(`UPDATE studio_users SET last_login_at=?,last_seen_at=?,updated_at=? WHERE id=?`).bind(now,now,now,user.id).run();
				await env.umbra_studio_production.prepare(`UPDATE studio_admin_members SET last_login_at=?,last_seen_at=? WHERE user_id=?`).bind(now,now,user.id).run();
				return json({ok:true,id},201);
			}
			const sessionMatch=url.pathname.match(/^\/api\/sessions\/([^/]+)$/);
			if(sessionMatch&&request.method==="PATCH"){
				const id=decodeURIComponent(sessionMatch[1]),now=new Date().toISOString();
				await env.umbra_studio_production.prepare(`UPDATE studio_collaborator_sessions SET last_seen_at=? WHERE id=? AND user_id=? AND signed_out_at IS NULL`).bind(now,id,user.id).run();
				await env.umbra_studio_production.prepare(`UPDATE studio_users SET last_seen_at=?,updated_at=? WHERE id=?`).bind(now,now,user.id).run();
				await env.umbra_studio_production.prepare(`UPDATE studio_admin_members SET last_seen_at=? WHERE user_id=?`).bind(now,user.id).run();
				return json({ok:true});
			}
			if(sessionMatch&&request.method==="DELETE"){
				const id=decodeURIComponent(sessionMatch[1]),now=new Date().toISOString();
				await env.umbra_studio_production.prepare(`UPDATE studio_collaborator_sessions SET signed_out_at=?,last_seen_at=? WHERE id=? AND user_id=?`).bind(now,now,id,user.id).run();
				return json({ok:true});
			}


			// ------------------------------------------------------------
			// STORY PRODUCTION (D1)
			// ------------------------------------------------------------
			if(request.method==="GET"&&url.pathname==="/api/production"){
				const [projects,arcs,scenes,beats,links,comments,assignments,notifications,journey,changes]=await Promise.all([
					getAll(env,`SELECT * FROM studio_story_projects ORDER BY updated_at DESC`),
					getAll(env,`SELECT * FROM studio_story_arcs ORDER BY sort_order ASC,updated_at DESC`),
					getAll(env,`SELECT * FROM studio_story_scenes ORDER BY sort_order ASC,updated_at DESC`),
					getAll(env,`SELECT * FROM studio_story_beats ORDER BY sort_order ASC,updated_at DESC`),
					getAll(env,`SELECT * FROM studio_story_entity_links ORDER BY created_at DESC`),
					getAll(env,`SELECT * FROM studio_review_comments ORDER BY created_at DESC LIMIT 300`),
					getAll(env,`SELECT * FROM studio_assignments ORDER BY updated_at DESC LIMIT 300`),
					getAll(env,`SELECT * FROM studio_notifications WHERE recipient_user_id=? ORDER BY created_at DESC LIMIT 300`,[user.id]),
					getAll(env,`SELECT * FROM studio_character_journey ORDER BY sort_order ASC,created_at DESC LIMIT 500`),
					getAll(env,`SELECT id,actor_user_id,COALESCE(actor_name,actor_email,'Studio Member') actor_name,action,entity_type,entity_id,entity_label,created_at FROM studio_activity_log ORDER BY created_at DESC LIMIT 100`)
				]);
				const health={
					projects:projects.length,scenes:scenes.length,
					open_assignments:(assignments as any[]).filter(x=>!["done","completed","closed"].includes(String(x.status))).length,
					my_unread_notifications:(notifications as any[]).filter(x=>!x.is_read).length,
					continuity_open:Number((await env.umbra_studio_production.prepare(`SELECT COUNT(*) n FROM studio_continuity_issues WHERE status IN ('open','reviewing')`).first<any>())?.n??0)
				};
				return json({ok:true,projects,arcs,scenes,beats,links,comments,assignments,notifications,journey,changes,health});
			}
			const productionTables:Record<string,string>={
				"projects":"studio_story_projects","arcs":"studio_story_arcs","scenes":"studio_story_scenes","beats":"studio_story_beats"
			};
			const prodMatch=url.pathname.match(/^\/api\/production\/(projects|arcs|scenes|beats)(?:\/([^/]+))?$/);
			if(prodMatch&&request.method==="POST"&&!prodMatch[2]){
				requireRole(user,["primary_admin","admin","editor"]);const b=await readJsonBody(request);const id=crypto.randomUUID(),now=new Date().toISOString();
				const table=productionTables[prodMatch[1]];
				const configs:any={
					projects:{cols:["id","title","project_type","summary","status","created_by","updated_by","created_at","updated_at"],vals:[id,String(b.title??""),String(b.project_type??"story"),nullableString(b.summary),String(b.status??"planning"),user.id,user.id,now,now]},
					arcs:{cols:["id","project_id","title","summary","status","created_by","updated_by","created_at","updated_at"],vals:[id,nullableString(b.project_id),String(b.title??""),nullableString(b.summary),String(b.status??"planned"),user.id,user.id,now,now]},
					scenes:{cols:["id","project_id","arc_id","title","summary","pov_character_id","location_id","era","story_date","status","created_by","updated_by","created_at","updated_at"],vals:[id,nullableString(b.project_id),nullableString(b.arc_id),String(b.title??""),nullableString(b.summary),nullableString(b.pov_character_id),nullableString(b.location_id),nullableString(b.era),nullableString(b.story_date),String(b.status??"idea"),user.id,user.id,now,now]},
					beats:{cols:["id","project_id","arc_id","scene_id","title","description","beat_type","status","created_by","created_at","updated_at"],vals:[id,nullableString(b.project_id),nullableString(b.arc_id),nullableString(b.scene_id),String(b.title??""),nullableString(b.description),String(b.beat_type??"plot"),String(b.status??"idea"),user.id,now,now]}
				};
				const c=configs[prodMatch[1]];await env.umbra_studio_production.prepare(`INSERT INTO ${table}(${c.cols.join(",")}) VALUES(${c.cols.map(()=>"?").join(",")})`).bind(...c.vals).run();
				return json({ok:true,id},201);
			}
			if(prodMatch&&prodMatch[2]&&request.method==="PATCH"){
				requireRole(user,["primary_admin","admin","editor"]);const id=decodeURIComponent(prodMatch[2]),b=await readJsonBody(request),table=productionTables[prodMatch[1]];
				await env.umbra_studio_production.prepare(`UPDATE ${table} SET status=?,updated_at=? WHERE id=?`).bind(String(b.status??"idea"),new Date().toISOString(),id).run();
				return json({ok:true,id});
			}
			if(prodMatch&&prodMatch[2]&&request.method==="DELETE"){
				requireRole(user,["primary_admin","admin"]);const id=decodeURIComponent(prodMatch[2]),table=productionTables[prodMatch[1]];
				await env.umbra_studio_production.prepare(`DELETE FROM ${table} WHERE id=?`).bind(id).run();return json({ok:true,id});
			}
			if(request.method==="POST"&&url.pathname==="/api/production/links"){
				requireRole(user,["primary_admin","admin","editor"]);const b=await readJsonBody(request),id=crypto.randomUUID();
				await env.umbra_studio_production.prepare(`INSERT INTO studio_story_entity_links(id,story_entity_type,story_entity_id,linked_entity_type,linked_entity_id,relation_label,notes,created_at) VALUES(?,?,?,?,?,?,?,?)`)
				.bind(id,String(b.story_entity_type),String(b.story_entity_id),String(b.linked_entity_type),String(b.linked_entity_id),nullableString(b.relation_label),nullableString(b.notes),new Date().toISOString()).run();return json({ok:true,id},201);
			}
			const prodLinkMatch=url.pathname.match(/^\/api\/production\/links\/([^/]+)$/);
			if(prodLinkMatch&&request.method==="DELETE"){requireRole(user,["primary_admin","admin","editor"]);await env.umbra_studio_production.prepare(`DELETE FROM studio_story_entity_links WHERE id=?`).bind(decodeURIComponent(prodLinkMatch[1])).run();return json({ok:true});}
			if(request.method==="POST"&&url.pathname==="/api/production/reviews"){
				requireRole(user,["primary_admin","admin","editor"]);const b=await readJsonBody(request),id=crypto.randomUUID(),now=new Date().toISOString();
				await env.umbra_studio_production.prepare(`INSERT INTO studio_review_comments(id,entity_type,entity_id,body,status,created_by,created_at) VALUES(?,?,?,?,?,?,?)`)
				.bind(id,String(b.entity_type),String(b.entity_id),String(b.body??""),"open",user.id,now).run();
				if(b.notify_user_id){const nid=crypto.randomUUID();await env.umbra_studio_production.prepare(`INSERT INTO studio_notifications(id,recipient_user_id,title,body,entity_type,entity_id,is_read,created_at) VALUES(?,?,?,?,?,?,0,?)`).bind(nid,String(b.notify_user_id),"New review comment",String(b.body??""),String(b.entity_type),String(b.entity_id),now).run();}
				return json({ok:true,id},201);
			}
			const reviewMatch=url.pathname.match(/^\/api\/production\/reviews\/([^/]+)$/);
			if(reviewMatch&&request.method==="PATCH"){
				requireRole(user,["primary_admin","admin","editor"]);const id=decodeURIComponent(reviewMatch[1]),now=new Date().toISOString();
				await env.umbra_studio_production.prepare(`UPDATE studio_review_comments SET status='resolved',resolved_by=?,resolved_at=? WHERE id=?`).bind(user.id,now,id).run();return json({ok:true,id});
			}
			if(request.method==="POST"&&url.pathname==="/api/production/assignments"){
				requireRole(user,["primary_admin","admin","editor"]);const b=await readJsonBody(request),id=crypto.randomUUID(),now=new Date().toISOString();
				await env.umbra_studio_production.prepare(`INSERT INTO studio_assignments(id,title,description,entity_type,entity_id,assigned_to,assigned_by,priority,status,due_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`)
				.bind(id,String(b.title??""),nullableString(b.description),nullableString(b.entity_type),nullableString(b.entity_id),String(b.assigned_to),user.id,String(b.priority??"normal"),"open",nullableString(b.due_at),now,now).run();return json({ok:true,id},201);
			}
			const notificationMatch=url.pathname.match(/^\/api\/production\/notifications\/([^/]+)$/);
			if(notificationMatch&&request.method==="PATCH"){await env.umbra_studio_production.prepare(`UPDATE studio_notifications SET is_read=1 WHERE id=? AND recipient_user_id=?`).bind(decodeURIComponent(notificationMatch[1]),user.id).run();return json({ok:true});}
			if(request.method==="POST"&&url.pathname==="/api/production/journey"){
				requireRole(user,["primary_admin","admin","editor"]);const b=await readJsonBody(request),id=crypto.randomUUID(),now=new Date().toISOString();
				await env.umbra_studio_production.prepare(`INSERT INTO studio_character_journey(id,character_id,project_id,arc_id,scene_id,journey_type,title,description,before_value,after_value,created_by,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`)
				.bind(id,String(b.character_id),nullableString(b.project_id),nullableString(b.arc_id),nullableString(b.scene_id),String(b.journey_type??"development"),String(b.title??""),nullableString(b.description),nullableString(b.before_value),nullableString(b.after_value),user.id,now).run();return json({ok:true,id},201);
			}
			if(request.method==="GET"&&url.pathname==="/api/messages"){
				const rows=await getAll(env,`SELECT id,sender_user_id,recipient_user_id,body,entity_type,entity_id,read_at,created_at FROM studio_direct_messages WHERE sender_user_id=? OR recipient_user_id=? ORDER BY created_at ASC LIMIT 1000`,[user.id,user.id]);
				return json({ok:true,messages:rows});
			}
			if(request.method==="POST"&&url.pathname==="/api/messages"){
				const b=await readJsonBody(request),id=crypto.randomUUID(),body=String(b.body??"").trim(),target=String(b.recipient_user_id??"");
				if(!body||!target)return errorResponse(400,"Recipient and message are required.");
				await env.umbra_studio_production.prepare(`INSERT INTO studio_direct_messages(id,sender_user_id,recipient_user_id,body,entity_type,entity_id,created_at) VALUES(?,?,?,?,?,?,?)`)
				.bind(id,user.id,target,body,nullableString(b.entity_type),nullableString(b.entity_id),new Date().toISOString()).run();return json({ok:true,id},201);
			}


			const messageReadMatch=url.pathname.match(/^\/api\/messages\/read\/([^/]+)$/);
			if(messageReadMatch&&request.method==="PATCH"){
				const other=decodeURIComponent(messageReadMatch[1]),now=new Date().toISOString();
				await env.umbra_studio_production.prepare(`UPDATE studio_direct_messages SET read_at=? WHERE sender_user_id=? AND recipient_user_id=? AND read_at IS NULL`).bind(now,other,user.id).run();return json({ok:true});
			}

			// ------------------------------------------------------------
			// WORLD DATABASE (D1)
			// ------------------------------------------------------------
			if(request.method==="GET"&&url.pathname==="/api/world-database"){
				const [types,records,collections,tags,links,media,backups,colItems,tagItems,revisions,locks,templates,attachments,references,canon,issues,publicRows]=await Promise.all([
					getAll(env,`SELECT * FROM studio_record_types ORDER BY name`),getAll(env,`SELECT * FROM studio_database_records ORDER BY updated_at DESC`),
					getAll(env,`SELECT * FROM studio_collections ORDER BY name`),getAll(env,`SELECT id,name,created_at FROM studio_tags ORDER BY name`),
					getAll(env,`SELECT * FROM studio_universal_links ORDER BY created_at DESC LIMIT 500`),getAll(env,`SELECT * FROM studio_media_assets ORDER BY updated_at DESC`),
					getAll(env,`SELECT id,created_by,label,snapshot,created_at FROM studio_backup_snapshots ORDER BY created_at DESC LIMIT 50`),
					getAll(env,`SELECT id,collection_id,entity_type,entity_id,created_at FROM studio_collection_items`),getAll(env,`SELECT id,tag_id,entity_type,entity_id,created_at FROM studio_tag_assignments`),
					getAll(env,`SELECT * FROM studio_database_revisions ORDER BY created_at DESC LIMIT 200`),getAll(env,`SELECT * FROM studio_database_locks`),
					getAll(env,`SELECT * FROM studio_field_templates ORDER BY name`),getAll(env,`SELECT * FROM studio_media_attachments ORDER BY created_at DESC`),
					getAll(env,`SELECT * FROM studio_record_references ORDER BY created_at DESC`),getAll(env,`SELECT * FROM studio_canon_history ORDER BY created_at DESC LIMIT 300`),
					getAll(env,`SELECT * FROM studio_continuity_issues ORDER BY created_at DESC LIMIT 500`),getAll(env,`SELECT * FROM studio_public_settings LIMIT 1`)
				]);
				const parse=(x:any)=>{for(const k of ["details","snapshot","fields","tags"])if(typeof x?.[k]==="string")try{x[k]=JSON.parse(x[k])}catch{};return x};
				return json({ok:true,types,records:(records as any[]).map(parse),collections,tags,links,media:(media as any[]).map(parse),backups:(backups as any[]).map(parse),colItems,tagItems,revisions:(revisions as any[]).map(parse),locks,templates:(templates as any[]).map(parse),attachments,references,canon,issues:(issues as any[]).map(parse),publicSettings:(publicRows as any[])[0]??null,
					health:{records:records.length,active:(records as any[]).filter(x=>!x.archived_at).length,archived:(records as any[]).filter(x=>x.archived_at).length,links:links.length,media:media.length}});
			}
			if(request.method==="POST"&&url.pathname==="/api/world-database/records"){
				requireRole(user,["primary_admin","admin","editor"]);const b=await readJsonBody(request),id=crypto.randomUUID(),now=new Date().toISOString(),code=`REC-${Date.now()}`;
				await env.umbra_studio_production.prepare(`INSERT INTO studio_database_records(id,created_by,updated_by,record_type_id,record_code,name,subtitle,summary,details,workflow_status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`)
				.bind(id,user.id,user.id,String(b.record_type_id),code,String(b.name??""),nullableString(b.subtitle),nullableString(b.summary),jsonText(b.details,{}),String(b.workflow_status??"draft"),now,now).run();return json({ok:true,id},201);
			}
			const dbRecordMatch=url.pathname.match(/^\/api\/world-database\/records\/([^/]+)$/);
			if(dbRecordMatch&&request.method==="PUT"){
				requireRole(user,["primary_admin","admin","editor"]);const id=decodeURIComponent(dbRecordMatch[1]),b=await readJsonBody(request);
				const current=await env.umbra_studio_production.prepare(`SELECT * FROM studio_database_records WHERE id=?`).bind(id).first<any>();if(!current)return errorResponse(404,"Record not found.");
				await env.umbra_studio_production.prepare(`INSERT INTO studio_database_revisions(id,record_id,record_code,record_name,changed_by,changed_by_email,snapshot,created_at) VALUES(?,?,?,?,?,?,?,?)`)
				.bind(crypto.randomUUID(),id,current.record_code,current.name,user.id,user.email,JSON.stringify(current),new Date().toISOString()).run();
				await env.umbra_studio_production.prepare(`UPDATE studio_database_records SET name=?,subtitle=?,summary=?,image_url=?,notes=?,workflow_status=?,details=?,updated_by=?,updated_at=? WHERE id=?`)
				.bind(String(b.name??current.name),nullableString(b.subtitle),nullableString(b.summary),nullableString(b.image_url),nullableString(b.notes),String(b.workflow_status??current.workflow_status),jsonText(b.details,{}),user.id,new Date().toISOString(),id).run();return json({ok:true,id});
			}
			if(dbRecordMatch&&request.method==="PATCH"){
				requireRole(user,["primary_admin","admin","editor"]);const id=decodeURIComponent(dbRecordMatch[1]),b=await readJsonBody(request);
				if("archived_at" in b)await env.umbra_studio_production.prepare(`UPDATE studio_database_records SET archived_at=?,updated_at=? WHERE id=?`).bind(nullableString(b.archived_at),new Date().toISOString(),id).run();
				else if("workflow_status" in b)await env.umbra_studio_production.prepare(`UPDATE studio_database_records SET workflow_status=?,updated_at=? WHERE id=?`).bind(String(b.workflow_status),new Date().toISOString(),id).run();
				return json({ok:true,id});
			}
			if(request.method==="POST"&&url.pathname==="/api/world-database/collections"){const b=await readJsonBody(request),id=crypto.randomUUID();await env.umbra_studio_production.prepare(`INSERT INTO studio_collections(id,name,description,created_by,created_at) VALUES(?,?,?,?,?)`).bind(id,String(b.name??""),nullableString(b.description),user.id,new Date().toISOString()).run();return json({ok:true,id},201);}
			if(request.method==="POST"&&url.pathname==="/api/world-database/tags"){const b=await readJsonBody(request),id=crypto.randomUUID();await env.umbra_studio_production.prepare(`INSERT INTO studio_tags(id,name,created_by,created_at) VALUES(?,?,?,?)`).bind(id,String(b.name??""),user.id,new Date().toISOString()).run();return json({ok:true,id},201);}
			if(request.method==="POST"&&url.pathname==="/api/world-database/types"){requireRole(user,["primary_admin"]);const b=await readJsonBody(request),id=crypto.randomUUID();await env.umbra_studio_production.prepare(`INSERT INTO studio_record_types(id,name,slug,description,created_by,is_system,created_at) VALUES(?,?,?,?,?,0,?)`).bind(id,String(b.name),String(b.slug),nullableString(b.description),user.id,new Date().toISOString()).run();return json({ok:true,id},201);}
			if(request.method==="POST"&&url.pathname==="/api/world-database/links"){const b=await readJsonBody(request),id=crypto.randomUUID();await env.umbra_studio_production.prepare(`INSERT INTO studio_universal_links(id,source_type,source_id,target_type,target_id,relation_label,notes,created_by,created_at) VALUES(?,?,?,?,?,?,?,?,?)`).bind(id,String(b.source_type),String(b.source_id),String(b.target_type),String(b.target_id),String(b.relation_label),nullableString(b.notes),user.id,new Date().toISOString()).run();return json({ok:true,id},201);}
			const genericDelete:any={"links":"studio_universal_links","references":"studio_record_references","collection-items":"studio_collection_items","tag-assignments":"studio_tag_assignments","attachments":"studio_media_attachments"};
			const gd=url.pathname.match(/^\/api\/world-database\/(links|references|collection-items|tag-assignments|attachments)\/([^/]+)$/);if(gd&&request.method==="DELETE"){await env.umbra_studio_production.prepare(`DELETE FROM ${genericDelete[gd[1]]} WHERE id=?`).bind(decodeURIComponent(gd[2])).run();return json({ok:true});}
			if(request.method==="POST"&&url.pathname==="/api/world-database/references"){const b=await readJsonBody(request),id=crypto.randomUUID();await env.umbra_studio_production.prepare(`INSERT INTO studio_record_references(id,record_id,label,reference_type,url,citation,notes,created_by,created_at) VALUES(?,?,?,?,?,?,?,?,?)`).bind(id,String(b.record_id),String(b.label),String(b.reference_type),nullableString(b.url),nullableString(b.citation),nullableString(b.notes),user.id,new Date().toISOString()).run();return json({ok:true,id},201);}
			if(request.method==="POST"&&url.pathname==="/api/world-database/collection-items"){const b=await readJsonBody(request),id=crypto.randomUUID();await env.umbra_studio_production.prepare(`INSERT OR IGNORE INTO studio_collection_items(id,collection_id,entity_type,entity_id,created_at) VALUES(?,?,?,?,?)`).bind(id,String(b.collection_id),String(b.entity_type),String(b.entity_id),new Date().toISOString()).run();return json({ok:true,id},201);}
			if(request.method==="POST"&&url.pathname==="/api/world-database/tag-assignments"){const b=await readJsonBody(request),id=crypto.randomUUID();await env.umbra_studio_production.prepare(`INSERT OR IGNORE INTO studio_tag_assignments(id,tag_id,entity_type,entity_id,created_at) VALUES(?,?,?,?,?)`).bind(id,String(b.tag_id),String(b.entity_type),String(b.entity_id),new Date().toISOString()).run();return json({ok:true,id},201);}
			if(request.method==="POST"&&url.pathname==="/api/world-database/templates"){const b=await readJsonBody(request),id=crypto.randomUUID();await env.umbra_studio_production.prepare(`INSERT INTO studio_field_templates(id,record_type_id,name,fields,created_by,created_at) VALUES(?,?,?,?,?,?)`).bind(id,String(b.record_type_id),String(b.name),jsonText(b.fields,[]),user.id,new Date().toISOString()).run();return json({ok:true,id},201);}
			if(request.method==="POST"&&url.pathname==="/api/world-database/attachments"){const b=await readJsonBody(request),id=crypto.randomUUID();await env.umbra_studio_production.prepare(`INSERT OR IGNORE INTO studio_media_attachments(id,media_id,entity_type,entity_id,created_at) VALUES(?,?,?,?,?)`).bind(id,String(b.media_id),String(b.entity_type),String(b.entity_id),new Date().toISOString()).run();return json({ok:true,id},201);}
			if(request.method==="POST"&&url.pathname==="/api/world-database/backup"){requireRole(user,["primary_admin"]);const b=await readJsonBody(request),id=crypto.randomUUID(),now=new Date().toISOString();const snapshot={records:await getAll(env,`SELECT * FROM studio_database_records`),characters:await getAll(env,`SELECT * FROM studio_characters`),world:await getAll(env,`SELECT * FROM studio_world_records`)};await env.umbra_studio_production.prepare(`INSERT INTO studio_backup_snapshots(id,created_by,label,snapshot,created_at) VALUES(?,?,?,?,?)`).bind(id,user.id,String(b.label??"Umbra Studio backup"),JSON.stringify(snapshot),now).run();return json({ok:true,id},201);}
			const lockMatch=url.pathname.match(/^\/api\/world-database\/locks\/([^/]+)$/);
			if(lockMatch&&request.method==="POST"){const rid=decodeURIComponent(lockMatch[1]),now=new Date(),exp=new Date(now.getTime()+15*60000).toISOString();const existing=await env.umbra_studio_production.prepare(`SELECT locked_by,expires_at FROM studio_database_locks WHERE record_id=?`).bind(rid).first<any>();if(existing&&existing.locked_by!==user.id&&String(existing.expires_at)>now.toISOString())return errorResponse(409,"This record is currently being edited by another Studio admin.");await env.umbra_studio_production.prepare(`INSERT OR REPLACE INTO studio_database_locks(record_id,locked_by,locked_by_email,locked_at,expires_at) VALUES(?,?,?,?,?)`).bind(rid,user.id,user.email,now.toISOString(),exp).run();return json({ok:true});}
			if(lockMatch&&request.method==="DELETE"){await env.umbra_studio_production.prepare(`DELETE FROM studio_database_locks WHERE record_id=? AND locked_by=?`).bind(decodeURIComponent(lockMatch[1]),user.id).run();return json({ok:true});}
			const revRestore=url.pathname.match(/^\/api\/world-database\/revisions\/([^/]+)\/restore$/);
			if(revRestore&&request.method==="POST"){requireRole(user,["primary_admin","admin"]);const rev=await env.umbra_studio_production.prepare(`SELECT * FROM studio_database_revisions WHERE id=?`).bind(decodeURIComponent(revRestore[1])).first<any>();if(!rev)return errorResponse(404,"Revision not found.");let snap:any={};try{snap=JSON.parse(rev.snapshot)}catch{return errorResponse(400,"Revision snapshot is invalid.");}const rid=String(rev.record_id);const cur=await env.umbra_studio_production.prepare(`SELECT * FROM studio_database_records WHERE id=?`).bind(rid).first<any>();if(cur)await env.umbra_studio_production.prepare(`INSERT INTO studio_database_revisions(id,record_id,record_code,record_name,changed_by,changed_by_email,snapshot,created_at) VALUES(?,?,?,?,?,?,?,?)`).bind(crypto.randomUUID(),rid,cur.record_code,cur.name,user.id,user.email,JSON.stringify(cur),new Date().toISOString()).run();await env.umbra_studio_production.prepare(`UPDATE studio_database_records SET name=?,subtitle=?,summary=?,details=?,image_url=?,notes=?,workflow_status=?,archived_at=?,updated_by=?,updated_at=? WHERE id=?`).bind(snap.name,snap.subtitle,snap.summary,typeof snap.details==="string"?snap.details:JSON.stringify(snap.details??{}),snap.image_url,snap.notes,snap.workflow_status,snap.archived_at,user.id,new Date().toISOString(),rid).run();return json({ok:true,id:rid});}


			// ------------------------------------------------------------
			// MIGRATION COMPLETION API — ADMIN / CANON / EXPLORER / AUXILIARY
			// ------------------------------------------------------------
			if(request.method==="POST"&&url.pathname==="/api/collaborators"){
				requireRole(user,["primary_admin"]);const b=await readJsonBody(request);const email=String(b.email??"").trim().toLowerCase();const role=String(b.role??"editor");
				if(!email||!["primary_admin","admin","editor"].includes(role))return errorResponse(400,"A valid collaborator email and role are required.");
				const target=await env.umbra_studio_production.prepare(`SELECT id FROM studio_users WHERE lower(email)=? LIMIT 1`).bind(email).first<{id:string}>();
				if(!target)return errorResponse(404,"That user must sign in to Umbra Studio once before they can be added.");
				await env.umbra_studio_production.prepare(`INSERT INTO studio_admin_members(user_id,role,created_at) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET role=excluded.role`).bind(target.id,role,new Date().toISOString()).run();return json({ok:true,user_id:target.id});
			}
			const collaboratorMatch=url.pathname.match(/^\/api\/collaborators\/([^/]+)$/);
			if(collaboratorMatch&&request.method==="PATCH"){
				requireRole(user,["primary_admin"]);const id=decodeURIComponent(collaboratorMatch[1]),b=await readJsonBody(request);
				if(typeof b.display_name==="string")await env.umbra_studio_production.prepare(`UPDATE studio_users SET display_name=?,updated_at=? WHERE id=?`).bind(String(b.display_name).trim()||null,new Date().toISOString(),id).run();
				if(typeof b.role==="string"){if(!["primary_admin","admin","editor"].includes(String(b.role)))return errorResponse(400,"Invalid role.");await env.umbra_studio_production.prepare(`UPDATE studio_admin_members SET role=? WHERE user_id=?`).bind(String(b.role),id).run();}
				return json({ok:true,id});
			}
			if(collaboratorMatch&&request.method==="DELETE"){
				requireRole(user,["primary_admin"]);const id=decodeURIComponent(collaboratorMatch[1]);const target=await env.umbra_studio_production.prepare(`SELECT role FROM studio_admin_members WHERE user_id=?`).bind(id).first<{role:string}>();
				if(!target)return errorResponse(404,"Collaborator not found.");if(target.role==="primary_admin")return errorResponse(409,"The Primary Admin cannot be removed.");
				await env.umbra_studio_production.prepare(`DELETE FROM studio_admin_members WHERE user_id=?`).bind(id).run();return json({ok:true,id});
			}
			if(request.method==="PATCH"&&url.pathname==="/api/me/display-name"){
				const b=await readJsonBody(request),name=String(b.display_name??"").trim();if(!name)return errorResponse(400,"Display name is required.");
				await env.umbra_studio_production.prepare(`UPDATE studio_users SET display_name=?,updated_at=? WHERE id=?`).bind(name,new Date().toISOString(),user.id).run();return json({ok:true});
			}

			if(request.method==="POST"&&url.pathname==="/api/world-database/media"){
				const b=await readJsonBody(request),id=crypto.randomUUID(),now=new Date().toISOString();await env.umbra_studio_production.prepare(`INSERT INTO studio_media_assets(id,uploaded_by,title,asset_url,media_type,caption,credit,alt_text,tags,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)`).bind(id,user.id,String(b.title??""),String(b.asset_url??""),String(b.media_type??"image"),nullableString(b.caption),nullableString(b.credit),nullableString(b.alt_text),jsonText(b.tags,[]),now,now).run();return json({ok:true,id},201);
			}
			const mediaAssetMatch=url.pathname.match(/^\/api\/world-database\/media\/([^/]+)$/);if(mediaAssetMatch&&request.method==="DELETE"){await env.umbra_studio_production.prepare(`DELETE FROM studio_media_assets WHERE id=?`).bind(decodeURIComponent(mediaAssetMatch[1])).run();return json({ok:true});}
			if(request.method==="POST"&&url.pathname==="/api/world-database/bulk"){
				const b=await readJsonBody(request),ids=Array.isArray(b.ids)?b.ids.map(String).filter(Boolean):[];if(!ids.length)return errorResponse(400,"At least one record is required.");
				const qs=ids.map(()=>"?").join(",");if(typeof b.workflow_status==="string")await env.umbra_studio_production.prepare(`UPDATE studio_database_records SET workflow_status=?,updated_at=? WHERE id IN (${qs})`).bind(String(b.workflow_status),new Date().toISOString(),...ids).run();
				if(b.archive===true)await env.umbra_studio_production.prepare(`UPDATE studio_database_records SET archived_at=?,updated_at=? WHERE id IN (${qs})`).bind(new Date().toISOString(),new Date().toISOString(),...ids).run();return json({ok:true,count:ids.length});
			}
			if(request.method==="POST"&&url.pathname==="/api/world-database/import"){
				const b=await readJsonBody(request),rows=Array.isArray(b.rows)?b.rows:[];for(const raw of rows as any[]){const id=crypto.randomUUID(),now=new Date().toISOString(),code=`REC-${Date.now()}-${id.slice(0,6)}`;await env.umbra_studio_production.prepare(`INSERT INTO studio_database_records(id,created_by,updated_by,record_type_id,record_code,name,subtitle,summary,details,workflow_status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id,user.id,user.id,String(raw.record_type_id),code,String(raw.name??""),nullableString(raw.subtitle),nullableString(raw.summary),jsonText(raw.details,{}),String(raw.workflow_status??"draft"),now,now).run();}return json({ok:true,count:rows.length},201);
			}
			if(request.method==="DELETE"&&url.pathname==="/api/duplicates"){
				requireRole(user,["primary_admin","admin"]);const b=await readJsonBody(request),table=String(b.table??""),id=String(b.id??"");const allowed:Record<string,string>={studio_characters:"studio_characters",studio_world_records:"studio_world_records",studio_world_locations:"studio_world_locations",studio_database_records:"studio_database_records",studio_story_projects:"studio_story_projects",studio_story_arcs:"studio_story_arcs",studio_story_scenes:"studio_story_scenes"};if(!allowed[table]||!id)return errorResponse(400,"Unsupported duplicate type.");await env.umbra_studio_production.prepare(`DELETE FROM ${allowed[table]} WHERE id=?`).bind(id).run();return json({ok:true});
			}
			const canonMatch=url.pathname.match(/^\/api\/world-database\/records\/([^/]+)\/canon$/);
			if(canonMatch&&request.method==="PATCH"){
				const id=decodeURIComponent(canonMatch[1]),b=await readJsonBody(request),status=String(b.status??"concept"),reason=nullableString(b.reason),now=new Date().toISOString();const current=await env.umbra_studio_production.prepare(`SELECT canon_status,name FROM studio_database_records WHERE id=?`).bind(id).first<any>();if(!current)return errorResponse(404,"Record not found.");
				await env.umbra_studio_production.prepare(`UPDATE studio_database_records SET canon_status=?,updated_by=?,updated_at=? WHERE id=?`).bind(status,user.id,now,id).run();await env.umbra_studio_production.prepare(`INSERT INTO studio_canon_history(id,entity_type,entity_id,entity_label,previous_status,new_status,reason,changed_by,changed_by_name,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)`).bind(crypto.randomUUID(),"database_record",id,current.name,current.canon_status,status,reason,user.id,user.displayName??user.email,now).run();return json({ok:true,id});
			}
			const publicRecordMatch=url.pathname.match(/^\/api\/world-database\/records\/([^/]+)\/public$/);if(publicRecordMatch&&request.method==="PATCH"){const id=decodeURIComponent(publicRecordMatch[1]),b=await readJsonBody(request);await env.umbra_studio_production.prepare(`UPDATE studio_database_records SET is_public=?,public_slug=?,updated_by=?,updated_at=? WHERE id=?`).bind(boolInt(b.is_public),nullableString(b.public_slug),user.id,new Date().toISOString(),id).run();return json({ok:true,id});}
			if(request.method==="POST"&&url.pathname==="/api/world-database/continuity/scan"){
				const rows=await getAll(env,`SELECT lower(trim(name)) key,group_concat(id) ids,name,COUNT(*) n FROM studio_database_records WHERE archived_at IS NULL GROUP BY lower(trim(name)) HAVING COUNT(*)>1`);const now=new Date().toISOString();for(const row of rows as any[]){const existing=await env.umbra_studio_production.prepare(`SELECT id FROM studio_continuity_issues WHERE issue_type='duplicate_name' AND entity_id=? AND status IN ('open','reviewing') LIMIT 1`).bind(String(row.ids)).first<any>();if(!existing)await env.umbra_studio_production.prepare(`INSERT INTO studio_continuity_issues(id,issue_type,severity,entity_type,entity_id,entity_label,message,details,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)`).bind(crypto.randomUUID(),"duplicate_name","warning","database_record",String(row.ids),String(row.name),`Multiple active World Database records share this name.`,JSON.stringify({ids:String(row.ids).split(",")}),"open",now,now).run();}return json({ok:true,found:rows.length});
			}
			const continuityMatch=url.pathname.match(/^\/api\/world-database\/continuity\/([^/]+)$/);if(continuityMatch&&request.method==="PATCH"){const id=decodeURIComponent(continuityMatch[1]),b=await readJsonBody(request),status=String(b.status??"open"),now=new Date().toISOString();await env.umbra_studio_production.prepare(`UPDATE studio_continuity_issues SET status=?,resolved_by=?,resolved_at=?,updated_at=? WHERE id=?`).bind(status,status==="resolved"?user.id:null,status==="resolved"?now:null,now,id).run();return json({ok:true,id});}
			if(request.method==="PUT"&&url.pathname==="/api/public-settings"){requireRole(user,["primary_admin"]);const b=await readJsonBody(request);const current=await env.umbra_studio_production.prepare(`SELECT id,title,subtitle,introduction,hero_image_url,is_enabled FROM studio_public_settings LIMIT 1`).first<any>();if(!current)return errorResponse(404,"Public settings are not initialized.");await env.umbra_studio_production.prepare(`UPDATE studio_public_settings SET title=?,subtitle=?,introduction=?,hero_image_url=?,is_enabled=?,updated_by=?,updated_at=? WHERE id=?`).bind(String(b.title??current.title??"Umbra Encyclopedia"),b.subtitle===undefined?current.subtitle:nullableString(b.subtitle),b.introduction===undefined?current.introduction:nullableString(b.introduction),b.hero_image_url===undefined?current.hero_image_url:nullableString(b.hero_image_url),b.is_enabled===undefined?Number(current.is_enabled??0):boolInt(b.is_enabled),user.id,new Date().toISOString(),current.id).run();return json({ok:true});}
			if(request.method==="GET"&&url.pathname==="/api/public-encyclopedia"){
				const settings=await env.umbra_studio_production.prepare(`SELECT * FROM studio_public_settings LIMIT 1`).first<any>();if(!settings?.is_enabled)return errorResponse(409,"The public Umbra Encyclopedia is not enabled yet.");const [records,types,characters,codex,locations,timeline]=await Promise.all([getAll(env,`SELECT * FROM studio_database_records WHERE is_public=1 AND workflow_status='published' AND archived_at IS NULL ORDER BY name`),getAll(env,`SELECT * FROM studio_record_types ORDER BY name`),getAll(env,`SELECT * FROM studio_characters WHERE is_public=1 AND is_complete=1 ORDER BY updated_at DESC`),getAll(env,`SELECT * FROM studio_world_records WHERE is_public=1 ORDER BY name`),getAll(env,`SELECT * FROM studio_world_locations WHERE is_public=1 AND archived_at IS NULL ORDER BY name`),getAll(env,`SELECT * FROM studio_timeline_events WHERE is_public=1 AND archived_at IS NULL ORDER BY sort_order`)]);return json({ok:true,settings,records,types,characters,codex,locations,timeline});
			}

			if(request.method==="POST"&&url.pathname==="/api/world-relations"){
				const b=await readJsonBody(request),source=String(b.source_record_id??""),target=String(b.target_record_id??"");if(!source||!target||source===target)return errorResponse(400,"Two different Codex records are required.");const now=new Date().toISOString();for(const [a,z] of [[source,target],[target,source]]){const old=await env.umbra_studio_production.prepare(`SELECT id FROM studio_world_relations WHERE source_record_id=? AND target_record_id=? LIMIT 1`).bind(a,z).first<any>();if(old)await env.umbra_studio_production.prepare(`UPDATE studio_world_relations SET relation_label=?,owner_user_id=? WHERE id=?`).bind(nullableString(b.relation_label),user.id,old.id).run();else await env.umbra_studio_production.prepare(`INSERT INTO studio_world_relations(id,owner_user_id,source_record_id,target_record_id,relation_label,created_at) VALUES(?,?,?,?,?,?)`).bind(crypto.randomUUID(),user.id,a,z,nullableString(b.relation_label),now).run();}return json({ok:true});
			}
			if(request.method==="DELETE"&&url.pathname==="/api/world-relations/pair"){const b=await readJsonBody(request),source=String(b.source_record_id??""),target=String(b.target_record_id??"");await env.umbra_studio_production.prepare(`DELETE FROM studio_world_relations WHERE (source_record_id=? AND target_record_id=?) OR (source_record_id=? AND target_record_id=?)`).bind(source,target,target,source).run();return json({ok:true});}

			if(request.method==="GET"&&url.pathname==="/api/explorer"){
				const atlas=await env.umbra_studio_production.prepare(`SELECT * FROM studio_world_atlas LIMIT 1`).first<any>();
				let favorites:any[]=[];
				try{favorites=await getAll(env,`SELECT entity_type,entity_id FROM studio_favorites WHERE user_id=?`,[user.id]);}catch{favorites=[];}
				return json({ok:true,atlas:atlas??null,favorites});
			}
			if(request.method==="PUT"&&url.pathname==="/api/explorer/atlas"){
				const b=await readJsonBody(request);
				const info=await getAll(env,`PRAGMA table_info(studio_world_atlas)`) as any[];
				const columns=new Set(info.map((x:any)=>String(x.name)));
				if(!columns.has("id"))return errorResponse(500,"World Atlas schema is missing its id column.");
				const existing=await env.umbra_studio_production.prepare(`SELECT * FROM studio_world_atlas LIMIT 1`).first<any>();
				const id=existing?.id??crypto.randomUUID();
				const values:any={id,user_id:user.id,title:String(b.title??existing?.title??"The Umbral World"),map_url:b.map_url===undefined?(existing?.map_url??null):nullableString(b.map_url),description:b.description===undefined?(existing?.description??null):nullableString(b.description),is_public:b.is_public===undefined?Number(existing?.is_public??0):boolInt(b.is_public)};
				const writable=["user_id","title","map_url","description","is_public"].filter(x=>columns.has(x));
				if(existing){
					if(writable.length){const sql=`UPDATE studio_world_atlas SET ${writable.map(x=>`${x}=?`).join(",")} WHERE id=?`;await env.umbra_studio_production.prepare(sql).bind(...writable.map(x=>values[x]),id).run();}
				}else{
					const insertColumns=["id",...writable];const sql=`INSERT INTO studio_world_atlas(${insertColumns.join(",")}) VALUES(${insertColumns.map(()=>"?").join(",")})`;await env.umbra_studio_production.prepare(sql).bind(...insertColumns.map(x=>values[x])).run();
				}
				return json({ok:true,id,atlas:await env.umbra_studio_production.prepare(`SELECT * FROM studio_world_atlas WHERE id=?`).bind(id).first<any>()});
			}
			if(request.method==="PUT"&&url.pathname==="/api/explorer/favorite"){
                                const b=await readJsonBody(request);
                                const type=String(b.item_type??b.entity_type??"").trim();
                                const entityId=String(b.item_id??b.entity_id??"").trim();
                                const enabled=boolInt(b.enabled);

                                if(!type||!entityId){
                                        return json({ok:false,error:"Favorite requires item_type and item_id."},400);
                                }

                                if(enabled){
                                        const existing=await env.umbra_studio_production.prepare(
                                                `SELECT rowid FROM studio_favorites WHERE user_id=? AND entity_type=? AND entity_id=? LIMIT 1`
                                        ).bind(user.id,type,entityId).first<any>();

                                        if(!existing){
                                                await env.umbra_studio_production.prepare(
                                                        `INSERT INTO studio_favorites(id,user_id,entity_type,entity_id) VALUES(?,?,?,?)`
                                                ).bind(crypto.randomUUID(),user.id,type,entityId).run();
                                        }
                                }else{
                                        await env.umbra_studio_production.prepare(
                                                `DELETE FROM studio_favorites WHERE user_id=? AND entity_type=? AND entity_id=?`
                                        ).bind(user.id,type,entityId).run();
                                }

                                return json({ok:true,entity_type:type,entity_id:entityId,enabled:Boolean(enabled)});
                        }

			// ------------------------------------------------------------
			// REVISION HISTORY
			// ------------------------------------------------------------

			if (
				request.method === "GET" &&
				url.pathname === "/api/revisions"
			) {
				const requestedLimit = Number(
					url.searchParams.get("limit") ?? "100",
				);

				const limit = Number.isFinite(requestedLimit)
					? Math.min(Math.max(Math.trunc(requestedLimit), 1), 500)
					: 100;

				const rows = await getAll(
					env,
					`
						SELECT
							id,
							entity_type,
							entity_id,
							entity_label,
							changed_by,
							changed_by_email,
							snapshot,
							created_at
						FROM studio_revisions
						ORDER BY created_at DESC
						LIMIT ?
					`,
					[limit],
				);

				return json({
					ok: true,
					count: rows.length,
					revisions: rows,
				});
			}

			// ------------------------------------------------------------
			// COLLABORATORS
			// ------------------------------------------------------------

			if (
				request.method === "GET" &&
				url.pathname === "/api/collaborators"
			) {
				const rows = await getAll(
					env,
					`
						SELECT
							u.id,
							u.email,
							u.display_name,
							u.auth_status,
							u.last_login_at,
							u.last_seen_at,
							a.role,
							a.created_at
						FROM studio_users u
						INNER JOIN studio_admin_members a
							ON a.user_id = u.id
						ORDER BY
							CASE a.role
								WHEN 'primary_admin' THEN 1
								WHEN 'admin' THEN 2
								WHEN 'editor' THEN 3
								ELSE 4
							END,
							u.display_name COLLATE NOCASE ASC
					`,
				);

				return json({
					ok: true,
					count: rows.length,
					collaborators: rows,
				});
			}

			return errorResponse(
				404,
				"Route not found.",
				{
					method: request.method,
					path: url.pathname,
				},
			);
		} catch (failure) {
			if (failure instanceof Response) {
				return failure;
			}

			console.error("Umbra Studio Cloud error:", failure);

			return errorResponse(
				500,
				"Umbra Studio Cloud encountered an error.",
			);
		}
	},
} satisfies ExportedHandler<Env>;