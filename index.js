const redis = require("redis");

var RedisContextStore = function (config) {
    this.config = config;
    this.client = null;
};

RedisContextStore.prototype.open = function () {
    return new Promise((resolve, reject) => {
        this.client = redis.createClient(this.config.port, this.config.host);
        this.client.on("ready", resolve);
        this.client.on("error", reject);
        this.client.select(this.config.db);
    });
};

RedisContextStore.prototype.close = function () {
    return new Promise((resolve, reject) => {
        if (this.client) {
            this.client.quit((err, reply) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(reply);
                }
            });
        } else {
            resolve();
        }
    });
};

RedisContextStore.prototype.get = function (scope, key, callback) {
    const prefixedScope = this.getPrefixedScope(scope);
    const keys = Array.isArray(key) ? key : [key];

    if (callback) {
        this.client.hmget(prefixedScope, keys, (err, values) => {
            if (err) {
                callback(err);
            } else {
                const result = values.map((value) => JSON.parse(value));
                callback(null, result.length === 1 ? result[0] : result);
            }
        });
    } else {
        return new Promise((resolve, reject) => {
            this.client.hmget(prefixedScope, keys, (err, values) => {
                if (err) {
                    reject(err);
                } else {
                    const result = values.map((value) => JSON.parse(value));
                    resolve(result.length === 1 ? result[0] : result);
                }
            });
        });
    }
};

RedisContextStore.prototype.set = function (scope, key, value, callback) {
    const prefixedScope = this.getPrefixedScope(scope);
    const data = {};

    if (value===undefined){
        this.client.hdel(prefixedScope, key); // Remove key if value is undefined
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
        this.client.hmset(prefixedScope, data, callback);
    } else {
        return new Promise((resolve, reject) => {
            this.client.hmset(prefixedScope, data, (err, reply) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(reply);
                }
            });
        });
    }
};

RedisContextStore.prototype.keys = function (scope, callback) {
    const prefixedScope = this.getPrefixedScope(scope);

    if (callback) {
        this.client.hkeys(prefixedScope, callback);
    } else {
        return new Promise((resolve, reject) => {
            this.client.hkeys(prefixedScope, (err, keys) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(keys);
                }
            });
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
