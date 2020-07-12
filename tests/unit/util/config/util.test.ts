import { getEnvOptional, getEnvOrDefault, getEnv, intoNumber, intoBoolean } from '../../../../src/util/config/util';

describe('getEnvOptional', () => {
	test('Defined inputs for getEnvOptional', () => {
		expect(getEnvOptional({ val: '3' }, 'val')).toStrictEqual('3');
		expect(getEnvOptional({ apple: '' }, 'apple')).toStrictEqual('');
		expect(getEnvOptional({ banana: 'this is a string' }, 'banana')).toStrictEqual('this is a string');
	});

	test('Undefined inputs for getEnvOptional', () => {
		expect(getEnvOptional({ val: '3' }, '3')).toBeUndefined();
		expect(getEnvOptional({ apple: '' }, '')).toBeUndefined();
		expect(getEnvOptional({ }, 'banana')).toBeUndefined();
	});
});

describe('getEnvOrDefault', () => {
	test('Defined inputs for getEnvOrDefault', () => {
		expect(getEnvOrDefault({ val: '3' }, 'val', '4')).toStrictEqual('3');
		expect(getEnvOrDefault({ apple: '' }, 'apple', 'string')).toStrictEqual('');
		expect(getEnvOrDefault({ banana: 'this is a string' }, 'banana', 'orange')).toStrictEqual('this is a string');
	});

	test('Undefined inputs for getEnvOrDefault', () => {
		expect(getEnvOrDefault({ val: '3' }, '3', 'defaultValue')).toStrictEqual('defaultValue');
		expect(getEnvOrDefault({ apple: '' }, '', 'orange')).toStrictEqual('orange');
		expect(getEnvOrDefault({ }, 'port', '25565')).toStrictEqual('25565');
	});
});

describe('getEnv', () => {
	test('Defined inputs for getEnv', () => {
		expect(getEnvOptional({ val: '3' }, 'val')).toStrictEqual('3');
		expect(getEnvOptional({ apple: '' }, 'apple')).toStrictEqual('');
		expect(getEnvOptional({ banana: 'this is a string' }, 'banana')).toStrictEqual('this is a string');
	});

	test('Undefined inputs for getEnv should throw', () => {
		expect(() => getEnv({ val: '3' }, '3')).toThrow();
		expect(() => getEnv({ apple: '' }, 'banana')).toThrow();
		expect(() => getEnv({ banana: 'this is a string' }, 'port')).toThrow();
	});
});

describe('intoNumber', () => {
	test('Valid inputs for intoNumber', () => {
		expect(intoNumber('1')).toStrictEqual(1);
		expect(intoNumber('1.0')).toStrictEqual(1);
		expect(intoNumber('23')).toStrictEqual(23);
		expect(intoNumber('0')).toStrictEqual(0);
		expect(intoNumber('-32.3')).toStrictEqual(-32.3);
		expect(intoNumber('42.6')).toStrictEqual(42.6);
		expect(intoNumber('8080')).toStrictEqual(8080);
	});

	test('Inalid inputs for intoNumber', () => {
		expect(() => intoNumber('a')).toThrow();
		expect(() => intoNumber('')).toThrow();
		expect(() => intoNumber(' ')).toThrow();
		expect(() => intoNumber('one')).toThrow();
		expect(() => intoNumber('.')).toThrow();
		expect(() => intoNumber('false')).toThrow();
	});
});

describe('intoBoolean', () => {
	test('Valid inputs for intoBoolean', () => {
		expect(intoBoolean('true')).toStrictEqual(true);
		expect(intoBoolean('1')).toStrictEqual(true);
		expect(intoBoolean('tRuE')).toStrictEqual(true);
		expect(intoBoolean('TRUE')).toStrictEqual(true);

		expect(intoBoolean('false')).toStrictEqual(false);
		expect(intoBoolean('0')).toStrictEqual(false);
		expect(intoBoolean('fAlSe')).toStrictEqual(false);
		expect(intoBoolean('FALSE')).toStrictEqual(false);
	});

	test('Invalid inputs for intoBoolean', () => {
		expect(() => intoBoolean('')).toThrow();
		expect(() => intoBoolean('  ')).toThrow();
		expect(() => intoBoolean('yes')).toThrow();
		expect(() => intoBoolean('no')).toThrow();
		expect(() => intoBoolean('1.0')).toThrow();
		expect(() => intoBoolean('0.0')).toThrow();
		expect(() => intoBoolean('tru')).toThrow();
		expect(() => intoBoolean('fals')).toThrow();
	});
});
