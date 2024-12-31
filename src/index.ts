import { DurableObject } from 'cloudflare:workers';

export class Counter extends DurableObject {
	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
	}

	async getCounterValue() {
		let value = (await this.ctx.storage.get('counter')) || 0;
		return value;
	}

	async increment(): Promise<number> {
		let value: number = (await this.ctx.storage.get('counter')) || 0;
		value++;
		await this.ctx.storage.put('counter', value);

		return value;
	}

	async decrement(): Promise<number> {
		let value: number = (await this.ctx.storage.get('counter')) || 0;
		value--;
		await this.ctx.storage.put('counter', value);

		return value;
	}
}

export default {
	async fetch(request, env, ctx): Promise<Response> {
		let id: DurableObjectId = env.MY_DURABLE_OBJECT.idFromName('counter');
		let stub = env.MY_DURABLE_OBJECT.get(id);

		let url = new URL(request.url);
		let count = null;

		switch (url.pathname) {
			case '/increment':
				count = await stub.increment();
				break;
			case '/decrement':
				count = await stub.decrement();
				break;
			case '/':
				// Serves the current value.
				count = await stub.getCounterValue();
				break;
			default:
				return new Response('Not found', { status: 404 });
		}

		return new Response(`Durable Object count: ${count}`);
	},
} satisfies ExportedHandler<Env>;
