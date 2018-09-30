'use strict'

const debug = require('debug')

// Method retriever
const getMethod = function (obj) {
  if (typeof obj === 'function') {
    return obj
  }
  var ns = obj
  while (typeof ns === 'object') {
    ns = ns[Object.keys(ns)[0]]
  }
  return ns
}

// Parameter parser
const params = function (fn) {
  let ret = getMethod(fn).toString().match(/^function *(\w*)\((.*?)\)/)[2]
  return ret ? ret.split(/ *, */) : []
}

/**
 * @class Server
 * An RPC Server base class.
 */
class Server {
  /**
   * @method constructor
   * Initialize a server with the given Socket.
   * @param {Socket} sock
   */
  constructor (socket) {
    if (typeof socket.format === 'function') {
      socket.format('json')
    }

    this.methods = {}
    socket.on('message', this.onmessage.bind(this))

    let me = this
    socket.on('close', function () {
      me.emit('close')
    })

    this.sock = socket
  }

  /**
   * @property {Socket} socket
   * The socket connection.
   * @readonly
   */
  get socket () {
    return this.sock
  }

  /**
   * @method close
   * Close the server.
   */
  close () {
    this.sock.close()
  }

  /**
   * @method methodDescriptions
   * Returns method descriptions.
   * @returns {object}
   * Returns an object with `name` (string) and `params` (array)
   * attributes.
   */
  methodDescriptions () {
    return this.getNamespace(this.methods, true)
  }

  /**
   * @method respondWithMethods
   * Response with the method descriptions.
   * @param {Function} reply
   * The reply function.
   */
  respondWithMethods (reply) {
    reply({ methods: this.methodDescriptions() })
  }

  /**
   * @method onmessage
   * @param {Object} message
   * The message received.
   * @param {Object} reply
   * The callback/reply method.
   * @private
   */
  onmessage (msg, reply) {
    if (msg.type === 'methods') {
      return this.respondWithMethods(reply)
    }

    if (!msg.method) {
      return reply({
        error: 'Method required'
      })
    }

    // Check for namespacing
    let ns = msg.method.split('.')
    let fn = null
    if (ns.length > 1) {
      fn = this.methods
      ns.forEach(function (attr) {
        fn = fn[attr]
      })
    } else {
      fn = this.methods[msg.method]
    }

    // ensure .method is exposed
    if (!fn) {
      return reply({
        error: 'Method "' + msg.method + '" does not exist'
      })
    }

    let args = msg.args
    if (!args) {
      return reply({
        error: '.args required'
      })
    }

    args.push(function (err) {
      if (err instanceof Error) {
        return reply({
          error: err.message
        })
      }

      reply({
        args: Array.prototype.slice.call(arguments, 1)
      })
    })

    fn.apply(null, args)
  }

  /**
   * @method getNamespace
   * Get the namespace tree
   * @param {Object} obj
   * @param {Object} parameters
   * @private
   */
  getNamespace (obj, parms) {
    parms = parms === undefined ? false : parms
    switch (typeof obj) {
      case 'function':
        return obj
      case 'object':
        let out = {}
        for (var ns in obj) {
          out[ns] = typeof obj[ns] === 'function' ? (parms === true ? {name: ns, params: params(obj[ns])} : obj[ns]) : this.getNamespace(obj[ns], parms)
        }
        return out
      default:
        throw new Error('Function attribute provided to expose() is invalid.')
    }
  }

  /**
   * @method expose
   * Expose a single method, object of methods, or an entire module.
   * @param {String|Object} name
   * @param {String|Object} fn
   */
  expose (name, fn) {
    if (arguments.length === 1) {
      for (var key in name) {
        this.expose(key, name[key])
      }
    } else {
      debug('expose "%s"', name)
      this.methods[name] = this.getNamespace(fn)
    }
  }
}

Object.setPrototypeOf(Server.prototype, require('events').EventEmitter.prototype)

module.exports = Server
