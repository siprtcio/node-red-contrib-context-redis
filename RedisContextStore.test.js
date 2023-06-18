const RedisContextStore = require('./RedisContextStore');

// Redis configuration for the test environment
const redisConfig = {
  host: 'localhost',
  port: 6379,
  db: 0,
  prefix: "myapp",
};

describe('RedisContextStore', () => {
  let store;

  beforeEach(() => {
    store = new RedisContextStore(redisConfig);
    store.open();
  });

  afterEach(async () => {
    await store.close();
  });

  test('set and get', async () => {
    const scope = 'testScope';
    const key = 'testKey';
    const value = 'testValue';

   store.set(scope, key, value);
   const result = await store.get(scope, key);

    expect(result).toEqual(value);
  });

  test('keys', async () => {
    const scope = 'testScope';
    const key1 = 'testKey1';
    const key2 = 'testKey2';
    const key3 = 'testKey3';

    await store.set(scope, key1, 'value1');
    await store.set(scope, key2, 'value2');
    await store.set(scope, key3, 'value3');

    const keys = await store.keys(scope);

    expect(keys).toContain(key1);
    expect(keys).toContain(key2);
    expect(keys).toContain(key3);
  });

  test('delete', async () => {
    const scope = 'testScope';
    const key = 'testKey';

    await store.set(scope, key, 'value');
    await store.delete(scope);

    const result = await store.get(scope, key);

    expect(result).toBeNull();
  });
});
