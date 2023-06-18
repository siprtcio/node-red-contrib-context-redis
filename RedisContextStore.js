const redis = require("redis");

var RedisContextStore = function (config) {
    this.config = config;
    this.client = null;
};

RedisContextStore.prototype.open = function () {
    return new Promise((resolve, reject) => {
        var redisURL = "redis://"+this.config.host+":"+this.config.port

        if (this.config.password !== undefined && this.config.username !== undefined && this.config.username.length > 0 ) {
            redisURL = "redis://"+this.config.username+":"+this.config.password+"@"+this.config.host+":"+this.config.port
        }

        this.client = redis.createClient({url: redisURL});

        (async () => {
            await this.client.connect();
        })();
        
        this.client.on('connect', async () => {
            console.log('Redis Client Connected'); 
            await this.client.select(this.config.db);
        });
        this.client.on('error', (err) => { console.log('Redis Client Connection Error', err); reject; });
        this.client.on("error", reject);
        this.client.on('ready', resolve);
    });
};

RedisContextStore.prototype.close = async function () {
    return new Promise(async (resolve, reject) => {
        if (this.client) {
            try {
                await this.client.disconnect();
                resolve();
            }catch(err){
                reject(err);
            }
        } else {
            resolve();
        }
    });
};

RedisContextStore.prototype.get = async function (scope, key, callback) {
    const prefixedScope = this.getPrefixedScope(scope);
    const keys = Array.isArray(key) ? key : [key];

    if (callback) {
        try {
            var values = await this.client.HMGET(prefixedScope, keys);
            const result = values.map((value) => JSON.parse(value));
            callback(null, result.length === 1 ? result[0] : result);
          } catch (err) {
            // ClosedClient Error
            callback(err);
          }
    } else {
        return new Promise( async(resolve, reject) => {
            try {
                var values = await this.client.HMGET(prefixedScope, keys);
                const result = values.map((value) => JSON.parse(value));
                resolve(result.length === 1 ? result[0] : result);
              } catch (err) {
                // ClosedClient Error
                reject(err);
            }
        });
    }
};

RedisContextStore.prototype.set = async function (scope, key, value, callback) {
    const prefixedScope = this.getPrefixedScope(scope);
    const data = {};

    if (value===undefined){
        this.client.hDel(prefixedScope, key); // Remove key if value is undefined
        if (callback) {
            callback();
        }
        return 
    }

    if (Array.isArray(key)) {
        key.forEach((k, i) => {
            data[k] = JSON.stringify(value[i]);
        });
    } else {
        data[key] = JSON.stringify(value);
    }

    if (callback) {
        try {
            await this.client.HSET(prefixedScope, data);
            callback();
          } catch (err) {
            // ClosedClient Error
            callback(err);
          }
    } else {
        return new Promise(async (resolve, reject) => {
            try {
                await this.client.HSET(prefixedScope, data);
                resolve();
            } catch (err) {
                // ClosedClient Error
                reject(err);
            }
        });
    }
};

RedisContextStore.prototype.keys =  function (scope, callback) {
    const prefixedScope = this.getPrefixedScope(scope);
    if (callback) {
        try {
            keys =  this.client.hKeys(prefixedScope);
            callback(keys)
          } catch (err) {
            callback(err)
          }
    } else {
        return new Promise(async (resolve, reject) => {
            try {
                keys =  this.client.hKeys(prefixedScope);
                resolve(keys);
            } catch (err) {
                reject(err);
            }
        });
    }
};

RedisContextStore.prototype.delete = function (scope) {
    const prefixedScope = this.getPrefixedScope(scope);
    this.client.del(prefixedScope);
};

RedisContextStore.prototype.clean = function (activeNodes) {
    return Promise.resolve();
};

RedisContextStore.prototype.getPrefixedScope = function (scope) {
    return this.config.prefix ? `${this.config.prefix}:${scope}` : scope;
};

module.exports = function (config) {
    return new RedisContextStore(config);
};
