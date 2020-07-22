import 'reflect-metadata';
import GatewayService from '../../../src/services/GatewayService';
import { container } from 'tsyringe';

const gatewayService = container.resolve(GatewayService);

describe('GatewayService', () => {
	describe('parseIncoming', () => {
		test('Accepts JSON string', () => {
			expect(gatewayService.parseIncoming(JSON.stringify({ test: 3 }))).toEqual({ test: 3 });
		});
		test('Accepts JSON buffer', () => {
			expect(gatewayService.parseIncoming(
				Buffer.from(JSON.stringify({ test: 3 }))
			)).toEqual({ test: 3 });
		});
		test('Accepts JSON buffers', () => {
			const data = Buffer.from(JSON.stringify({ test: 3 }));
			expect(gatewayService.parseIncoming([
				data.slice(0, 12),
				data.slice(12)
			])).toEqual({ test: 3 });
		});
		test('Rejects invalid data', () => {
			expect(() => gatewayService.parseIncoming('asdf')).toThrow();
		});
		test('Rejects invalid data type', () => {
			expect(() => gatewayService.parseIncoming(new ArrayBuffer(40))).toThrow(/ArrayBuffer/);
		});
	});
});
