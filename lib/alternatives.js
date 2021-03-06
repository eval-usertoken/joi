// Load modules

var Hoek = require('hoek');
var Any = require('./any');
var Cast = require('./cast');
var Errors = require('./errors');


// Declare internals

var internals = {};


internals.Alternatives = function () {

    Any.call(this);
    this._type = 'alternatives';
    this._invalids.remove(null);

    this._inner = [];
};

Hoek.inherits(internals.Alternatives, Any);


internals.Alternatives.prototype._base = function (value, state, options) {

    var errors = [];
    for (var i = 0, il = this._inner.length; i < il; ++i) {
        var item = this._inner[i];
        var schema = item.schema;
        if (!schema) {
            var failed = item.is._validate(item.ref(state.parent), null, options, state.parent).errors;
            schema = failed ? item.otherwise : item.then;
            if (!schema) {
                continue;
            }
        }

        var result = schema._validate(value, state, options);
        if (!result.errors) {     // Found a valid match
            return result;
        }

        errors = errors.concat(result.errors);
    }

    return { errors: errors.length ? errors : Errors.create('alternatives.base', null, state, options) };
};


internals.Alternatives.prototype.try = function (/* schemas */) {


    var schemas = Hoek.flatten(Array.prototype.slice.call(arguments));
    Hoek.assert(schemas.length, 'Cannot add other alternatives without at least one schema');

    var obj = this.clone();

    for (var i = 0, il = schemas.length; i < il; ++i) {
        var cast = Cast.schema(schemas[i]);
        if (cast._refs.length) {
            obj._refs = obj._refs.concat(cast._refs)
        }
        obj._inner.push({ schema: cast });
    }

    return obj;
};


internals.Alternatives.prototype.when = function (ref, options) {

    Hoek.assert(ref, 'Missing reference');
    Hoek.assert(options, 'Missing options');
    Hoek.assert(typeof options === 'object', 'Invalid options');
    Hoek.assert(options.is, 'Missing "is" directive');
    Hoek.assert(options.then !== undefined || options.otherwise !== undefined, 'options must have at least one of "then" or "otherwise"');

    var obj = this.clone();

    var item = {
        ref: Cast.ref(ref),
        is: Cast.schema(options.is),
        then: options.then !== undefined ? Cast.schema(options.then) : undefined,
        otherwise: options.otherwise !== undefined ? Cast.schema(options.otherwise) : undefined
    };

    obj._refs = obj._refs.concat(item.ref.root, item.is._refs);

    if (item.then && item.then._refs) {
        obj._refs = obj._refs.concat(item.then._refs);
    }

    if (item.otherwise && item.otherwise._refs) {
        obj._refs = obj._refs.concat(item.otherwise._refs);
    }

    obj._inner.push(item);

    return obj;
};


internals.Alternatives.prototype.describe = function () {

    var descriptions = [];
    for (var i = 0, il = this._inner.length; i < il; ++i) {
        var item = this._inner[i];
        if (item.schema) {

            // try()

            descriptions.push(item.schema.describe());
        }
        else {

            // when()

            var when = {
                ref: item.ref.key,
                is: item.is.describe()
            };

            if (item.then) {
                when.then = item.then.describe();
            }

            if (item.otherwise) {
                when.otherwise = item.otherwise.describe();
            }

            descriptions.push(when);
        }
    }

    return descriptions;
};


module.exports = new internals.Alternatives();
