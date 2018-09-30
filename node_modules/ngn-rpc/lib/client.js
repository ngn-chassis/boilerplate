'use strict'

/**
 * @class Client
 * An RPC client.
 * @fires ready
 * @fires disconnect
 */
class Client {
  /**
   * @constructor
   * Initialize an rpc client with a Socket.
   */
  constructor (socket) {
    if (typeof socket.format === 'function') {
      socket.format('json')
    }

    let me = this
    socket.on('connect', function () {
      me.emit('ready')
    })

    this.sock = socket
  }

  get socket () {
    return this.sock
  }

  /**
   * @method disconnect
   * Disconnect the socket.
   */
  disconnect () {
    this.sock.close()
    this.emit('disconnect')
  }

  /**
   * @method call
   * Invoke method `name` with args and invoke the
   * tailing callback function.
   *
   * @param {String} name
   * @param {Mixed} ...
   * @param {Function} fn
   */
  call (name) {
    let args = Array.prototype.slice.call(arguments, 1, -1)
    let fn = arguments[arguments.length - 1]

    this.socket.send({
      type: 'call',
      method: name,
      args: args
    }, function (msg) {
      if ('error' in msg) {
        var err = new Error(msg.error)
        err.stack = msg.stack || err.stack
        fn(err)
      } else {
        msg.args.unshift(null)
        fn.apply(null, msg.args)
      }
    })
  }

  /**
   * @method methods
   * Fetch the methods exposed and invoke `fn(err, methods)`.
   * @param {Function} callback
   */
  methods (fn) {
    this.socket.send({
      type: 'methods'
    }, function (msg) {
      fn(null, msg.methods)
    })
  }
}

Object.setPrototypeOf(Client.prototype, require('events').EventEmitter.prototype)

module.exports = Client
