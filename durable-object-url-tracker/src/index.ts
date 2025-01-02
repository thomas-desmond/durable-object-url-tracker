import { DurableObject } from 'cloudflare:workers';

/**
 * Welcome to Cloudflare Workers! This is your first Durable Objects application.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your Durable Object in action
 * - Run `npm run deploy` to publish your application
 *
 * Bind resources to your worker in `wrangler.toml`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/durable-objects
 */

/** A Durable Object's behavior is defined in an exported Javascript class */
// export class UrlTracker extends DurableObject {
// 	sql: SqlStorage;

// 	/**
// 	 * The constructor is invoked once upon creation of the Durable Object, i.e. the first call to
// 	 * 	`DurableObjectStub::get` for a given identifier (no-op constructors can be omitted)
// 	 *
// 	 * @param ctx - The interface for interacting with Durable Object state
// 	 * @param env - The interface to reference bindings declared in wrangler.toml
// 	 */
// 	constructor(ctx: DurableObjectState, env: Env) {
// 		super(ctx, env);
// 		this.sql = ctx.storage.sql;

// 		this.sql.exec(`CREATE TABLE IF NOT EXISTS settings(
// 		  id    INTEGER PRIMARY KEY,
// 		  key  TEXT,
// 		  value TEXT
// 		);

// 		CREATE TABLE IF NOT EXISTS referrals(
// 		  id    INTEGER PRIMARY KEY,
// 		  referrer  TEXT,
// 		  count INTEGER
// 		);

// 		INSERT INTO settings (key, value) VALUES ('destination_url', '');
// 		`);
// 	}

// 	/**
// 	 * The Durable Object exposes an RPC method sayHello which will be invoked when when a Durable
// 	 *  Object instance receives a request from a Worker via the same method invocation on the stub
// 	 *
// 	 * @param name - The name provided to a Durable Object instance from a Worker
// 	 * @returns The greeting to be sent back to the Worker
// 	 */

// 	async getDestinationUrl(): Promise<string> {
// 		const result = this.sql.exec("SELECT value FROM settings WHERE key='destination_url';").toArray()[0];
// 		return result.value as string;
// 	}

// 	async updateDestinationUrl(value: string) {
// 		this.sql.exec("UPDATE settings SET value = ? WHERE key = 'destination_url'", [value]);
// 	}

// 	async updateReferralTable(referralUrl: string) {
// 		const updateResult = this.sql.exec("UPDATE referrals SET count = count + 1 WHERE referrer = ?;", [referralUrl]);
// 		if(updateResult.rowsWritten === 0) {
// 			this.sql.exec("INSERT INTO referrals (referrer, count) VALUES (?, 1)", [referralUrl]);
// 		}
// 	}

// 	async getReferrals(): Promise<Record<string, SqlStorageValue>[]> {
// 		const result = this.sql.exec('SELECT * FROM referrals').toArray();
// 		return result;
// 	}
// }

export class UrlTracker extends DurableObject {
	/**
	 * The constructor is invoked once upon creation of the Durable Object, i.e. the first call to
	 * 	`DurableObjectStub::get` for a given identifier (no-op constructors can be omitted)
	 *
	 * @param ctx - The interface for interacting with Durable Object state
	 * @param env - The interface to reference bindings declared in wrangler.toml
	 */
	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
	}

	/**
	 * The Durable Object exposes an RPC method sayHello which will be invoked when when a Durable
	 *  Object instance receives a request from a Worker via the same method invocation on the stub
	 *
	 * @param name - The name provided to a Durable Object instance from a Worker
	 * @returns The greeting to be sent back to the Worker
	 */

	async getDestinationUrl(): Promise<string> {
		const result: string = (await this.ctx.storage.get('destinationUrl')) || 'www.google.com';
		return result;
	}

	async updateDestinationUrl(value: string) {
		await this.ctx.storage.put('destinationUrl', value);
	}

	async updateReferralTable(referralUrl: string) {
		const referralUrlCounter: number = (await this.ctx.storage.get(referralUrl)) || 0;
		if (referralUrlCounter === 0) {
			await this.ctx.storage.put(referralUrl, 1);
		} else {
			await this.ctx.storage.put(referralUrl, referralUrlCounter + 1);
		}
	}

	async getReferrals(): Promise<Map<string, any>> {
		const allItems = await this.ctx.storage.list();
		return allItems;
	}
}

import home from './ui/home.html';
import { nanoid } from 'nanoid';
import { generateAdminPageHtml } from './lib/admin';

export default {
	/**
	 * This is the standard fetch handler for a Cloudflare Worker
	 *
	 * @param request - The request submitted to the Worker from the client
	 * @param env - The interface to reference bindings declared in wrangler.toml
	 * @param ctx - The execution context of the Worker
	 * @returns The response to be sent back to the client
	 */
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);

		// Home Page
		if (url.pathname === '/') {
			return new Response(home, { headers: { 'Content-Type': 'text/html' } });

			// Get Tracked URL
		} else if (url.pathname === '/shorten' && request.method === 'POST') {
			const formData = await request.formData();
			const longUrl = formData.get('url') as string;

			if (!longUrl) {
				return new Response('Invalid URL', { status: 400 });
			}

			const shortCode = nanoid(8);
			let id: DurableObjectId = env.URL_TRACKER.idFromName(shortCode);
			let stub = env.URL_TRACKER.get(id);
			await stub.updateDestinationUrl(longUrl);

			const shortUrl = `${url.origin}/${shortCode}`;

			return new Response(`<p>Shortened URL: <a href="${shortUrl}" target="_blank">${shortUrl}</a></p>`, {
				headers: { 'Content-Type': 'text/html' },
			});

			// Admin Page SQL
			// } else if (url.pathname.endsWith('admin')) {
			// 	const shortCode = url.pathname.split('/')[1];
			// 	let id: DurableObjectId = env.URL_TRACKER.idFromName(shortCode);
			// 	let stub = env.URL_TRACKER.get(id);
			// 	const referrals = await stub.getReferrals() as { referrer: string, count: number}[]
			// 	const destinationUrl = await stub.getDestinationUrl();

			// 	const adminPage = generateAdminPageHtml(destinationUrl, shortCode, referrals)
			// 	return new Response(adminPage, { headers: { 'Content-Type': 'text/html' } });

		// Admin Page KV
		} else if (url.pathname.endsWith('admin')) {
			const shortCode = url.pathname.split('/')[1];
			let id: DurableObjectId = env.URL_TRACKER.idFromName(shortCode);
			let stub = env.URL_TRACKER.get(id);
			const referrals = await stub.getReferrals();
			const destinationUrl = await stub.getDestinationUrl();
			console.log(referrals)

			const adminPage = generateAdminPageHtml(destinationUrl, shortCode, referrals);
			return new Response(adminPage, { headers: { 'Content-Type': 'text/html' } });

			// Redirect
		} else if (url.pathname.startsWith('/') && url.pathname.length > 8) {
			let referringPage = request.headers.get('Referer');
			const shortCode = url.pathname.substring(1);
			let id: DurableObjectId = env.URL_TRACKER.idFromName(shortCode);
			let stub = env.URL_TRACKER.get(id);
			const longUrl = await stub.getDestinationUrl();

			if (!referringPage) {
				referringPage = 'Direct';
			}
			await stub.updateReferralTable(referringPage);

			if (longUrl) {
				return Response.redirect(longUrl, 302);
			} else {
				return new Response('URL not found', { status: 404 });
			}
			// Invalid URL
		} else {
			return new Response('Not Found', { status: 404 });
		}
	},
} satisfies ExportedHandler<Env>;
